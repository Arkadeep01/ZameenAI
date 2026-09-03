import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, ChangeEvent, FormEvent } from 'react'
import axios, { AxiosProgressEvent } from 'axios'

export const Route = createFileRoute("/uploads")({
  component: FileUploadRoute,
})

// Define the arguments for the mutation function
interface UploadArgs {
  file: File
  onProgress: (progressEvent: AxiosProgressEvent) => void
}

// The API fetcher using Axios
const uploadFileAPI = async ({ file, onProgress }: UploadArgs) => {
  const formData = new FormData()
  formData.append('file', file)

  // Replace '/api/upload' with your actual backend endpoint
  const response = await axios.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress,
  })

  return response.data
}

function FileUploadRoute() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const uploadMutation = useMutation({
    mutationFn: uploadFileAPI,
    onSuccess: () => {
      setFile(null)
      // Keep the 100% progress visible for a moment before resetting
      setTimeout(() => setProgress(0), 2000)
    },
    onError: () => {
      setProgress(0)
    }
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setProgress(0) // Reset progress when a new file is selected
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!file) return

    uploadMutation.mutate({
      file,
      onProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        }
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
        
        <h2 className="text-2xl font-light text-gray-100 mb-6 tracking-wide">
          Upload Assets
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-400/50 hover:bg-white/5 transition-all">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center text-gray-400 pointer-events-none">
              {file ? (
                <span className="text-indigo-300 font-medium">{file.name}</span>
              ) : (
                <span>Drag & drop or click to browse</span>
              )}
            </div>
          </div>

          {/* Progress Bar Container */}
          {(progress > 0 || uploadMutation.isPending) && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-indigo-300 mb-2 font-medium">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {uploadMutation.isPending ? 'Processing...' : 'Confirm Upload'}
          </button>

          {uploadMutation.isError && (
            <p className="text-red-400 text-sm text-center mt-2">
              Error: {uploadMutation.error.message}
            </p>
          )}
          {uploadMutation.isSuccess && progress === 0 && (
            <p className="text-emerald-400 text-sm text-center mt-2">
              File uploaded successfully!
            </p>
          )}
        </form>
      </div>
    </div>
  )
}