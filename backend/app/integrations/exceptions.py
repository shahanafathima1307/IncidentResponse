"""
Integration boundary exceptions.
Thrown when teammate modules (Agent, Memory, Knowledge) are not reachable,
not configured, or return invalid responses.
"""

from typing import Optional


class IntegrationError(Exception):
    """Base exception for all integration communication errors."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ModuleUnavailableError(IntegrationError):
    """Raised when an external teammate module is not reachable or unconfigured."""

    def __init__(
        self,
        module_name: str,
        service_url: Optional[str] = None,
        detail: Optional[str] = None,
        instructions: Optional[str] = None,
    ):
        self.module_name = module_name
        self.service_url = service_url
        self.detail = (
            detail
            or f"The '{module_name}' module is currently unavailable or not configured."
        )
        self.instructions = (
            instructions
            or f"Ensure the teammate's {module_name} service is running and configured via environment variables."
        )
        super().__init__(self.detail)


class IntegrationTimeoutError(IntegrationError):
    """Raised when communication with an external module times out."""

    def __init__(self, module_name: str, timeout_seconds: float):
        self.module_name = module_name
        self.timeout_seconds = timeout_seconds
        super().__init__(
            f"Module '{module_name}' timed out after {timeout_seconds}s."
        )


class IntegrationResponseError(IntegrationError):
    """Raised when an external module returns an error status code or invalid payload."""

    def __init__(self, module_name: str, status_code: int, response_text: str):
        self.module_name = module_name
        self.status_code = status_code
        self.response_text = response_text
        super().__init__(
            f"Module '{module_name}' returned HTTP {status_code}: {response_text}"
        )
