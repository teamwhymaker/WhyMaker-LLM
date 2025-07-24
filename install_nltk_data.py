import nltk
import ssl
import sys

def install_nltk_data():
    """
    Downloads NLTK data required by 'unstructured' library,
    handling potential SSL certificate errors on macOS.
    """
    print("Setting up NLTK data...")

    # This is the crucial part for macOS SSL certificate issues.
    # It creates an unverified SSL context to bypass the error.
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        # For systems where this is not needed
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

    # List of packages required by the unstructured library
    packages = ["punkt", "averaged_perceptron_tagger", "punkt_tab"]
    
    for package_id in packages:
        try:
            # Check if data is available by trying to find it
            print(f"  - Checking for '{package_id}'...")
            # The resource paths are slightly different based on type
            if "punkt" in package_id:
                nltk.data.find(f"tokenizers/{package_id}")
            else:
                 nltk.data.find(f"taggers/{package_id}")
            print(f"    '{package_id}' is already installed.")
        except LookupError:
            print(f"    '{package_id}' not found. Downloading...")
            # quiet=False shows download progress, which is helpful.
            nltk.download(package_id, quiet=False)
            print(f"    '{package_id}' downloaded successfully.")
        except Exception as e:
            print(f"An unexpected error occurred while handling '{package_id}': {e}", file=sys.stderr)
            sys.exit(1)

    print("\nNLTK setup complete. You can now run your main application.")

if __name__ == "__main__":
    install_nltk_data() 