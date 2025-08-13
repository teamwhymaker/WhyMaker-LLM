"""
Patch to ensure tiktoken works in frozen PyInstaller environments
"""
import sys

def patch_tiktoken():
	"""Monkey patch tiktoken to work in frozen environments"""
	if getattr(sys, 'frozen', False):
		import tiktoken
		import tiktoken.registry as reg
		# Ensure constructors are populated, then build the encoding object
		try:
			# Trigger constructor discovery
			reg.get_encoding("cl100k_base")
		except Exception:
			# Fallback: import openai_public to register constructors
			try:
				import tiktoken_ext.openai_public as op
				enc = tiktoken.Encoding(**op.cl100k_base())
				reg.ENCODINGS["cl100k_base"] = enc
			except Exception:
				pass