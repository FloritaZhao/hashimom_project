"""Package initializer for the HashiMom backend.

Exposes the application factory so that external tools (e.g. WSGI
servers or tests) can import and create the Flask app.
"""



from .app import create_app  # noqa: F401
