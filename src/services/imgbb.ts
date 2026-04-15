export async function uploadToImgBB(file: File): Promise<string> {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey || apiKey === "YOUR_IMGBB_API_KEY") {
    console.warn("VITE_IMGBB_API_KEY is not set. Using placeholder image.");
    return URL.createObjectURL(file); // Fallback for demo
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json() as any;
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error("ImgBB Upload Error:", error);
    throw error;
  }
}
