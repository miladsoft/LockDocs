import { UploadZone } from '@/components/upload/UploadZone'

export const metadata = { title: 'Upload Document | Vaultix' }

export default function UploadPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-slate-400 mt-1">Your file will be encrypted and stored securely. Original files are never exposed.</p>
      </div>
      <UploadZone />
    </div>
  )
}
