# Re-export from canonical location to prevent duplicate definitions.
# The authoritative IsAdmin lives in core.permissions and checks role == 'admin'.
from core.permissions import IsAdmin  # noqa: F401
