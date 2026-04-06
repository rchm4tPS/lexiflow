import { apiClient } from '../api/client';

/**
 * Uploads a file to the server and returns the absolute URL.
 * 
 * @param file The file to upload (Image or Audio)
 * @param type The type of file ('image' or 'audio')
 */
export async function uploadFile(file: File, type: 'image' | 'audio'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const data = await apiClient(`/upload/${type}`, {
        method: 'POST',
        body: formData,
    });

    // TODO: In production, this should likely be a relative path or an environment variable
    return `http://localhost:3000${data.url}`;
}
