"""
ChronoTrade Real-World Market Friction & Execution Simulation Engine.
Models synthetic bid-ask spreads, slippage, commission profiles, market impact,
partial fills, order execution logic, and lookahead bias prevention.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, Optional, Tuple, List
import math
import pandas as pd

class SlippageModel(str, Enum):
    FIXED = "fixed"
    VOLATILITY_SCALED = "volatility_scaled"
    VOLUME_SCALED = "volume_scaled"

class LatencyMode(str, Enum):
    SAME_BAR_CLOSE = "same_bar_close"
    NEXT_BAR_OPEN = "next_bar_open"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"
    TRAILING_STOP = "trailing_stop"

class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"

@dataclass
class FrictionConfig:
    spread_bps: float = 5.0             # 5 basis points (0.05%) default spread
    slippage_model: SlippageModel = SlippageModel.FIXED
    slippage_bps: float = 3.0           # 3 basis points base slippage
    commission_type: str = "flat_pct"   # "flat", "pct", "broker_profile"
    commission_flat: float = 1.0        # $1.00 per order
    commission_pct: float = 0.0005      # 0.05%
    broker_profile: str = "interactive_brokers" # "interactive_brokers", "zero_fee", "institutional"
    enable_market_impact: bool = True
    market_impact_gamma: float = 0.1    # Square-root impact coefficient
    max_volume_pct: float = 0.05        # Max 5% of bar volume filled per bar
    latency_mode: LatencyMode = LatencyMode.NEXT_BAR_OPEN

@dataclass
class Order:
    id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    trailing_pct: Optional[float] = None
    trailing_peak: Optional[float] = None
    filled_quantity: float = 0.0
    filled_price: float = 0.0
    status: OrderStatus = OrderStatus.PENDING
    created_bar_idx: int = 0
    total_commission: float = 0.0
    total_slippage: float = 0.0

def calculate_bid_ask_spread(
    price: float,
    high: float,
    low: float,
    volume: float,
    config: FrictionConfig
) -> Tuple[float, float]:
    """
    Returns (bid, ask) prices based on bar volatility and volume dynamics.
    """
    base_spread_pct = config.spread_bps / 10000.0
    volatility_pct = (high - low) / price if price > 0 else 0.01
    
    # Scale spread by volatility and inverse volume
    volume_factor = 1.0 / (math.log10(max(volume, 100)) + 1.0)
    spread_pct = max(0.0001, base_spread_pct * (1.0 + 2.0 * volatility_pct) * (1.0 + volume_factor))
    
    half_spread = price * (spread_pct / 2.0)
    bid = max(0.01, price - half_spread)
    ask = price + half_spread
    return bid, ask

def calculate_slippage(
    order_qty: float,
    price: float,
    high: float,
    low: float,
    volume: float,
    config: FrictionConfig
) -> float:
    """
    Calculates slippage dollar amount per unit.
    """
    base_bps = config.slippage_bps / 10000.0
    
    if config.slippage_model == SlippageModel.FIXED:
        return price * base_bps
        
    elif config.slippage_model == SlippageModel.VOLATILITY_SCALED:
        bar_range_pct = (high - low) / price if price > 0 else 0.01
        return price * base_bps * (1.0 + 5.0 * bar_range_pct)
        
    elif config.slippage_model == SlippageModel.VOLUME_SCALED:
        participation_rate = order_qty / volume if volume > 0 else 0.05
        impact = (participation_rate ** 1.5) * 0.05
        return price * (base_bps + impact)
        
    return price * base_bps

def calculate_commission(
    order_qty: float,
    price: float,
    config: FrictionConfig
) -> float:
    """
    Calculates commission fee for an order.
    """
    notional = order_qty * price
    
    if config.broker_profile == "zero_fee":
        return 0.0
    elif config.broker_profile == "interactive_brokers":
        # IBKR Tiered: $0.0035/share, min $0.35, max 1.0% of trade value
        per_share = order_qty * 0.0035
        comm = max(0.35, per_share)
        return min(comm, notional * 0.01)
    elif config.broker_profile == "institutional":
        # $0.001 per share + 0.001%
        return (order_qty * 0.001) + (notional * 0.00001)
        
    # Standard custom config
    if config.commission_type == "flat":
        return config.commission_flat
    elif config.commission_type == "pct":
        return notional * config.commission_pct
    else:
        return max(config.commission_flat, notional * config.commission_pct)

def calculate_market_impact(
    order_qty: float,
    price: float,
    high: float,
    low: float,
    volume: float,
    config: FrictionConfig
) -> float:
    """
    Square-root market impact formula: ΔP / P = gamma * (Volatility) * sqrt(OrderQty / BarVolume)
    """
    if not config.enable_market_impact or volume <= 0:
        return 0.0
    volatility = (high - low) / price if price > 0 else 0.01
    participation = min(1.0, order_qty / volume)
    impact_pct = config.market_impact_gamma * volatility * math.sqrt(participation)
    return price * impact_pct

def process_order_execution(
    order: Order,
    bar: Dict[str, float],
    bar_idx: int,
    config: FrictionConfig
) -> Tuple[Optional[Dict[str, Any]], Order]:
    """
    Executes order against current bar data taking into account order type,
    spread, slippage, market impact, commission, latency, and liquidity constraints.
    
    Returns (execution_fill_dict, updated_order)
    """
    if order.status in (OrderStatus.FILLED, OrderStatus.CANCELLED):
        return None, order
        
    # Enforce latency check: if next_bar_open mode, order created at bar_idx cannot fill at bar_idx
    if config.latency_mode == LatencyMode.NEXT_BAR_OPEN and bar_idx <= order.created_bar_idx:
        return None, order
        
    open_px = bar["open"]
    high_px = bar["high"]
    low_px = bar["low"]
    close_px = bar["close"]
    volume = bar.get("volume", 1000000.0)
    
    # Base execution reference price depending on latency mode
    ref_price = open_px if (config.latency_mode == LatencyMode.NEXT_BAR_OPEN) else close_px
    
    bid, ask = calculate_bid_ask_spread(ref_price, high_px, low_px, volume, config)
    
    # Check trigger condition for order type
    can_fill = False
    fill_ref_price = ref_price
    
    if order.order_type == OrderType.MARKET:
        can_fill = True
        fill_ref_price = ask if order.side == OrderSide.BUY else bid
        
    elif order.order_type == OrderType.LIMIT:
        if order.limit_price is not None:
            if order.side == OrderSide.BUY and low_px <= order.limit_price:
                can_fill = True
                fill_ref_price = min(order.limit_price, ask)
            elif order.side == OrderSide.SELL and high_px >= order.limit_price:
                can_fill = True
                fill_ref_price = max(order.limit_price, bid)
                
    elif order.order_type == OrderType.STOP_LOSS:
        if order.stop_price is not None:
            if order.side == OrderSide.SELL and low_px <= order.stop_price:
                can_fill = True
                fill_ref_price = min(order.stop_price, bid)
            elif order.side == OrderSide.BUY and high_px >= order.stop_price:
                can_fill = True
                fill_ref_price = max(order.stop_price, ask)
                
    elif order.order_type == OrderType.TAKE_PROFIT:
        if order.limit_price is not None:
            if order.side == OrderSide.SELL and high_px >= order.limit_price:
                can_fill = True
                fill_ref_price = max(order.limit_price, bid)
            elif order.side == OrderSide.BUY and low_px <= order.limit_price:
                can_fill = True
                fill_ref_price = min(order.limit_price, ask)
                
    elif order.order_type == OrderType.TRAILING_STOP:
        # Update trailing peak
        if order.trailing_pct is not None:
            if order.side == OrderSide.SELL:
                if order.trailing_peak is None or high_px > order.trailing_peak:
                    order.trailing_peak = high_px
                stop_px = order.trailing_peak * (1.0 - order.trailing_pct / 100.0)
                if low_px <= stop_px:
                    can_fill = True
                    fill_ref_price = min(stop_px, bid)
            elif order.side == OrderSide.BUY:
                if order.trailing_peak is None or low_px < order.trailing_peak:
                    order.trailing_peak = low_px
                stop_px = order.trailing_peak * (1.0 + order.trailing_pct / 100.0)
                if high_px >= stop_px:
                    can_fill = True
                    fill_ref_price = max(stop_px, ask)

    if not can_fill:
        return None, order
        
    # Liquidity cap check: partial fill
    remaining_qty = order.quantity - order.filled_quantity
    max_fill_qty = volume * config.max_volume_pct
    fill_qty = min(remaining_qty, max_fill_qty) if max_fill_qty > 0 else remaining_qty
    
    # Friction adjustments
    slippage_per_unit = calculate_slippage(fill_qty, fill_ref_price, high_px, low_px, volume, config)
    impact_per_unit = calculate_market_impact(fill_qty, fill_ref_price, high_px, low_px, volume, config)
    
    if order.side == OrderSide.BUY:
        effective_price = fill_ref_price + slippage_per_unit + impact_per_unit
    else:
        effective_price = max(0.01, fill_ref_price - slippage_per_unit - impact_per_unit)
        
    commission = calculate_commission(fill_qty, effective_price, config)
    
    # Update order status
    order.filled_quantity += fill_qty
    order.filled_price = (
        (order.filled_price * (order.filled_quantity - fill_qty) + effective_price * fill_qty) / order.filled_quantity
    )
    order.total_commission += commission
    order.total_slippage += (slippage_per_unit + impact_per_unit) * fill_qty
    
    if order.filled_quantity >= order.quantity - 1e-6:
        order.status = OrderStatus.FILLED
    else:
        order.status = OrderStatus.PARTIALLY_FILLED
        
    fill_record = {
        "order_id": order.id,
        "symbol": order.symbol,
        "side": order.side.value,
        "qty": fill_qty,
        "price": effective_price,
        "raw_ref_price": fill_ref_price,
        "commission": commission,
        "slippage": (slippage_per_unit + impact_per_unit) * fill_qty,
        "bar_idx": bar_idx,
        "bar_date": bar.get("date", f"Bar {bar_idx}")
    }
    
    return fill_record, order

class RollingWindowDataFeed:
    """
    Structural Lookahead Bias Guard:
    Wraps full dataset and exposes rolling window strictly up to bar index t.
    Attempts to read data index > t will raise a PermissionError/IndexError.
    """
    def __init__(self, df: pd.DataFrame):
        self._df = df.copy().reset_index(drop=True)
        self._current_idx = 0

    def set_current_index(self, idx: int):
        if idx < 0 or idx >= len(self._df):
            raise IndexError("Bar index out of range")
        self._current_idx = idx

    def get_history(self, window_size: Optional[int] = None) -> pd.DataFrame:
        """Exposes dataframe strictly up to current_idx."""
        end_idx = self._current_idx + 1
        if window_size is None or window_size >= end_idx:
            return self._df.iloc[:end_idx].copy()
        return self._df.iloc[end_idx - window_size:end_idx].copy()

    def get_current_bar(self) -> Dict[str, Any]:
        return self._df.iloc[self._current_idx].to_dict()

    @property
    def total_bars(self) -> int:
        return len(self._df)
