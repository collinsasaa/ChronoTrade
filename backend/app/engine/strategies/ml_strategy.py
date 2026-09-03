"""
Machine Learning Directional Trading Strategy.
Engineers technical features (RSI, MA ratio, volatility, lagged returns),
trains Scikit-Learn Logistic Regression or Decision Tree model on rolling window,
and predicts next-bar direction (Up / Down).
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from app.engine.strategies.base import Strategy, Signal, SignalType

class MLPredictorStrategy(Strategy):
    """
    ML Directional Predictor:
    Engineers feature vector X_t = [RSI_14, MA_Ratio_10_30, Volatility_10, Return_t1, Return_t2, Return_t3].
    Target Y_t = 1 if Return_{t+1} > 0 else 0.
    Trains Logistic Regression on rolling window.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "train_window": 120,
            "retrain_freq": 30,
            "prob_threshold": 0.55,
            "model_type": "logistic" # "logistic" or "decision_tree"
        }
        if params:
            default_params.update(params)
        super().__init__("ML Directional Predictor", default_params)
        self.model = None
        self.last_trained_idx = -1

    def feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create feature matrix from OHLCV history."""
        closes = df["close"]
        rets = closes.pct_change()
        
        # Technical indicators as features
        ma10 = closes.rolling(10).mean()
        ma30 = closes.rolling(30).mean()
        ma_ratio = ma10 / ma30.replace(0, 1e-9)
        
        # RSI 14
        delta = rets
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rsi = 100.0 - (100.0 / (1.0 + (gain / loss.replace(0, 1e-9))))
        
        vol10 = rets.rolling(10).std()
        
        feat_df = pd.DataFrame({
            "ret_lag1": rets.shift(1),
            "ret_lag2": rets.shift(2),
            "ret_lag3": rets.shift(3),
            "ma_ratio": ma_ratio,
            "rsi": rsi / 100.0,
            "vol10": vol10
        })
        
        # Target: Next bar direction (1 for positive return, 0 for non-positive)
        feat_df["target"] = (rets.shift(-1) > 0).astype(int)
        return feat_df

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        train_window = int(self.params["train_window"])
        retrain_freq = int(self.params["retrain_freq"])
        threshold = float(self.params["prob_threshold"])
        model_type = self.params.get("model_type", "logistic")
        symbol = current_bar.get("symbol", "ASSET")
        
        bar_count = len(history)
        if bar_count < train_window + 35:
            return []
            
        # Re-train model periodically
        if self.model is None or (bar_count - self.last_trained_idx) >= retrain_freq:
            feat_df = self.feature_engineering(history.iloc[-train_window - 35:])
            valid_df = feat_df.dropna()
            
            if len(valid_df) < 50:
                return []
                
            X_train = valid_df.drop(columns=["target"])
            y_train = valid_df["target"]
            
            if model_type == "decision_tree":
                self.model = DecisionTreeClassifier(max_depth=3, random_state=42)
            else:
                self.model = LogisticRegression(max_iter=200, C=1.0, random_state=42)
                
            try:
                self.model.fit(X_train, y_train)
                self.last_trained_idx = bar_count
            except Exception:
                return []

        # Predict for current bar
        feat_df = self.feature_engineering(history.iloc[-40:])
        current_feat = feat_df.drop(columns=["target"]).iloc[[-1]]
        
        if current_feat.isna().any().any():
            return []
            
        try:
            prob_up = self.model.predict_proba(current_feat)[0][1]
        except Exception:
            return []
            
        curr_pos = context.get("current_position", 0.0)
        
        if prob_up >= threshold and curr_pos <= 0:
            return [Signal(
                signal_type=SignalType.BUY,
                symbol=symbol,
                target_pct=1.0,
                reason=f"ML Model Predicts UP Probability ({prob_up:.1%}) >= Threshold ({threshold:.1%})"
            )]
        elif prob_up < (1.0 - threshold) and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol,
                target_pct=0.0,
                reason=f"ML Model Predicts DOWN Probability ({(1-prob_up):.1%}) >= Threshold ({threshold:.1%})"
            )]
            
        return []
