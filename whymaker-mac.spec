# whymaker-mac.spec
# PyInstaller spec for macOS app bundle

block_cipher = None

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

hidden = []
hidden += collect_submodules('pytesseract')
hidden += collect_submodules('fastapi')
hidden += collect_submodules('uvicorn')
# Ensure LangChain dynamic modules are included
hidden += collect_submodules('langchain')
hidden += collect_submodules('langchain_core')
# Explicitly include the history-aware retriever module
hidden += ['langchain.chains.history_aware_retriever']
# Include Google Cloud Storage client modules
hidden += collect_submodules('google.cloud.storage')
hidden += collect_submodules('google.auth')
# Include ChromaDB modules (fixes missing telemetry submodule in packaged app)
hidden += collect_submodules('chromadb')
# Include additional dependencies used at runtime
hidden += collect_submodules('openai')
hidden += collect_submodules('starlette')
hidden += collect_submodules('pydantic')
hidden += collect_submodules('PIL')
hidden += collect_submodules('docx')
hidden += collect_submodules('pptx')
hidden += collect_submodules('langchain_openai')
hidden += collect_submodules('langchain_community')
hidden += collect_submodules('langchain_chroma')
hidden += collect_submodules('tiktoken')
hidden += collect_submodules('tiktoken_ext')
hidden += collect_submodules('unstructured')
hidden += collect_submodules('nltk')
# Include local app modules
hidden += ['api', 'rag']

# Include FastAPI/Starlette static templates if needed
_datas = []
_datas += collect_data_files('fastapi')
_datas += collect_data_files('uvicorn')
# Include tiktoken data files (encodings)
_datas += collect_data_files('tiktoken')
_datas += collect_data_files('tiktoken_ext')
# Include nltk data if present
_datas += collect_data_files('nltk')
_datas += collect_data_files('certifi')

binaries = [
    ('packaging/macos/bin/tesseract', 'packaging/macos/bin'),
]

datas = _datas + [
    ('frontend_build', 'frontend_build'),
    ('packaging/macos/tessdata', 'packaging/macos/tessdata'),
    ('api.py', '.'),
    ('rag.py', '.'),
    ('tiktoken_patch.py', '.'),
]


a = Analysis(
    ['run_local.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas,
    name='WhyMaker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)
app = BUNDLE(
    exe,
    name='WhyMaker.app',
    icon=None,
    bundle_identifier='com.whymaker.app',
)