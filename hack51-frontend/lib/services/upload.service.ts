import api from "../api";
import { supabase } from "../supabase";

export const uploadFile = async (file: File) => {
  const res = await api.post("/candidate/uploads/sign", {
    filename: file.name,
    content_type: file.type,
  });

  const data = res.data;

  const { error } = await supabase.storage
    .from(data.bucket)
    .uploadToSignedUrl(data.path, data.token, file);

  if (error) throw error;

  return data.public_url as string;
};
