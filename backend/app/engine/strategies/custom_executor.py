"""
Custom User Python Strategy Execution Sandbox.
Parses, AST-validates, and evaluates custom Python strategy code provided by advanced users in a restricted sandbox.
"""

import ast
import multiprocessing
import queue
from typing import List, Dict, Any, Optional
import pandas as pd
from app.engine.strategies.base import Strategy, Signal, SignalType

FORBIDDEN_BUILTINS = {
    "open", "eval", "exec", "__import__", "getattr", "setattr", "delattr",
    "globals", "locals", "compile", "breakpoint", "input", "help", "system",
    "popen", "spawn", "fork", "exit", "quit", "memoryview", "super"
}

SAFE_BUILTINS = {
    "range": range, "len": len, "int": int, "float": float, "str": str,
    "bool": bool, "list": list, "dict": dict, "set": set, "tuple": tuple,
    "abs": abs, "min": min, "max": max, "sum": sum, "round": round,
    "enumerate": enumerate, "zip": zip, "isinstance": isinstance,
    "any": any, "all": all, "None": None, "True": True, "False": False,
    "ValueError": ValueError, "TypeError": TypeError, "Exception": Exception
}

class SafetyVisitor(ast.NodeVisitor):
    """
    AST Visitor that raises ValueError if code contains dangerous constructs.
    """
    def visit_Import(self, node):
        raise ValueError("Imports ('import ...') are strictly prohibited in custom strategy code.")

    def visit_ImportFrom(self, node):
        raise ValueError("Imports ('from ... import ...') are strictly prohibited in custom strategy code.")

    def visit_Attribute(self, node):
        if node.attr.startswith("__"):
            raise ValueError(f"Access to dunder attribute '{node.attr}' is strictly prohibited.")
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id.startswith("__") and node.id != "__name__":
            raise ValueError(f"Access to forbidden identifier '{node.id}' is strictly prohibited.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_BUILTINS:
                raise ValueError(f"Call to forbidden function '{node.func.id}()' is strictly prohibited.")
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr.startswith("__"):
                raise ValueError(f"Call to dunder attribute '{node.func.attr}' is strictly prohibited.")
        self.generic_visit(node)


def validate_and_compile(code_str: str) -> ast.AST:
    """Validates Python syntax and enforces strict AST security constraints."""
    try:
        parsed_ast = ast.parse(code_str, mode="exec")
    except SyntaxError as se:
        raise ValueError(f"Syntax error in custom strategy code: {se}")

    visitor = SafetyVisitor()
    visitor.visit(parsed_ast)
    return parsed_ast


def _sandbox_worker(code_str: str, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any], params: Dict[str, Any], out_q: multiprocessing.Queue):
    """
    Worker function executed in isolated process.
    """
    try:
        global_scope = {
            "__builtins__": SAFE_BUILTINS,
            "pd": pd,
            "Signal": Signal,
            "SignalType": SignalType,
            "params": params
        }
        local_scope = {}
        compiled = compile(ast.parse(code_str), filename="<custom_strategy>", mode="exec")
        exec(compiled, global_scope, local_scope)

        func = local_scope.get("on_bar") or global_scope.get("on_bar")
        if not func or not callable(func):
            out_q.put(("ok", []))
            return

        res = func(history, current_bar, context)
        if isinstance(res, list):
            out_q.put(("ok", res))
        elif isinstance(res, Signal):
            out_q.put(("ok", [res]))
        else:
            out_q.put(("ok", []))
    except Exception as e:
        out_q.put(("error", str(e)))


class CustomCodeStrategy(Strategy):
    """
    Executes user-defined Python code snippet inside a sandboxed environment.
    """
    def __init__(self, code_str: str, params: Optional[Dict[str, Any]] = None):
        super().__init__("Custom Python Strategy", params or {})
        self.code_str = code_str
        self.compile_code()

    def compile_code(self):
        # Validate AST for safety
        validate_and_compile(self.code_str)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        out_q = multiprocessing.Queue()
        p = multiprocessing.Process(
            target=_sandbox_worker,
            args=(self.code_str, history, current_bar, context, self.params, out_q)
        )
        p.start()
        p.join(timeout=2.0)  # 2 second execution limit

        if p.is_alive():
            p.terminate()
            p.join()
            return []

        try:
            status, payload = out_q.get_nowait()
            if status == "ok" and isinstance(payload, list):
                return payload
        except queue.Empty:
            pass
        return []
