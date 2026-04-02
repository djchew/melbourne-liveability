from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import suburbs

app = FastAPI(
    title="Melbourne Liveability API",
    description="Suburb liveability scores for Greater Melbourne",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(suburbs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
