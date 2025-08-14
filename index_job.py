import os
from rag import process_documents


def main() -> None:
    # Resolve mount points and configure env for rag.py
    chroma_dir = os.getenv("WHYMAKER_CHROMA_DIR", "/mnt/chroma")
    manifest_path = os.getenv(
        "WHYMAKER_MANIFEST_FILE", os.path.join(chroma_dir, "processed_files.json")
    )
    uploads_dir = os.getenv("WHYMAKER_UPLOADS_DIR", "/mnt/uploads")

    os.environ["WHYMAKER_CHROMA_DIR"] = chroma_dir
    os.environ["WHYMAKER_MANIFEST_FILE"] = manifest_path
    # Index job writes directly to the mounted DB
    os.environ["WHYMAKER_CHROMA_READONLY"] = "false"

    print(
        f"Index job: ingesting from {uploads_dir} → {chroma_dir} (manifest {manifest_path})",
        flush=True,
    )
    process_documents(uploads_dir)


if __name__ == "__main__":
    main()

