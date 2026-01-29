import hashlib


def hash_files(files):

    hasher = hashlib.sha256()

    for file in sorted(files):
        with open(file, "rb") as f:
            hasher.update(f.read())

    return hasher.hexdigest()
