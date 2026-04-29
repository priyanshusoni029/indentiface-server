import os
from supabase import create_client, Client
from config import Config

class SupabaseStorage:
    def __init__(self):
        self.url: str = Config.SUPABASE_URL
        self.key: str = Config.SUPABASE_KEY
        self.client = None
        
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print(f"[Supabase Storage] Init error: {e}")

    def upload_file(self, bucket: str, remote_path: str, local_path: str):
        """Upload a local file to a Supabase bucket."""
        if not self.client: 
            print("[Supabase Storage] Client not initialized!")
            return False
        try:
            with open(local_path, 'rb') as f:
                self.client.storage.from_(bucket).upload(
                    path=remote_path,
                    file=f,
                    file_options={"content-type": "image/jpeg", "x-upsert": "true"}
                )
            print(f"[Supabase Storage] Successfully uploaded {remote_path} to bucket {bucket}")
            return True
        except Exception as e:
            print(f"[Supabase Storage] Upload error for {remote_path} in {bucket}: {e}")
            return False

    def download_file(self, bucket: str, remote_path: str, local_path: str):
        """Download a file from Supabase to a local path."""
        if not self.client: return False
        try:
            res = self.client.storage.from_(bucket).download(remote_path)
            with open(local_path, 'wb+') as f:
                f.write(res)
            return True
        except Exception as e:
            print(f"[Supabase Storage] Download error: {e}")
            return False

    def move_file(self, from_bucket: str, to_bucket: str, from_path: str, to_path: str):
        """Move a file between buckets."""
        if not self.client: return False
        try:
            if from_bucket == to_bucket:
                self.client.storage.from_(from_bucket).move(from_path, to_path)
                return True
            else:
                # Cross bucket move
                temp_path = os.path.join(Config.BASE_DIR, f"temp_{os.path.basename(from_path)}")
                if self.download_file(from_bucket, from_path, temp_path):
                    if self.upload_file(to_bucket, to_path, temp_path):
                        self.client.storage.from_(from_bucket).remove([from_path])
                        if os.path.exists(temp_path): os.remove(temp_path)
                        return True
            return False
        except Exception as e:
            print(f"[Supabase Storage] Move error: {e}")
            return False

    def delete_file(self, bucket: str, path: str):
        """Delete a file from a bucket."""
        if not self.client: return False
        try:
            self.client.storage.from_(bucket).remove([path])
            return True
        except Exception as e:
            print(f"[Supabase Storage] Delete error: {e}")
            return False

    def get_public_url(self, bucket: str, path: str):
        """Get the public URL for a file."""
        if not self.client: return None
        try:
            return self.client.storage.from_(bucket).get_public_url(path)
        except Exception:
            return None

# Global instance
supabase_storage = SupabaseStorage()
