import React, { useState } from 'react';
import {
  FileText,
  FilePlus,
  FlaskConical,
  Image,
  Upload,
  X as CloseIcon,
  DownloadCloud,
  Folder,
} from 'lucide-react';

// Document categories and icons
const categories = [
  { key: 'all', label: 'All', icon: Folder },
  { key: 'prescription', label: 'Prescriptions', icon: FileText },
  { key: 'scan', label: 'Scans', icon: Image },
  { key: 'lab', label: 'Lab Records', icon: FlaskConical },
  { key: 'other', label: 'Others', icon: FileText },
];

// Demo document data type
interface Document {
  id: number;
  title: string;
  category: string;
  date: string;
  description?: string;
  fileUrl: string;
  imageUrl: string;
}

const DigiLocker: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 1,
      title: 'Prescription - Dr. Rao',
      category: 'prescription',
      date: '2025-04-20',
      description: 'Blood pressure medication, 2 months',
      fileUrl: '#',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=thumb&w=400&q=80',
    },
    {
      id: 2,
      title: 'Chest X-Ray',
      category: 'scan',
      date: '2025-03-15',
      description: 'Routine checkup scan',
      fileUrl: '#',
      imageUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=thumb&w=400&q=80', // X-Ray
    },
    {
      id: 3,
      title: 'Lab Report - CBC',
      category: 'lab',
      date: '2025-04-10',
      description: 'Complete blood count report',
      fileUrl: '#',
      imageUrl: 'https://images.unsplash.com/photo-1588776814546-ec7e6c2b1bda?auto=format&fit=thumb&w=400&q=80', // Lab Report
    },
    {
      id: 4,
      title: 'Insurance Card',
      category: 'other',
      date: '2025-01-05',
      description: 'Medical insurance details',
      fileUrl: '#',
      imageUrl: 'https://images.unsplash.com/photo-1507662228758-08d030c4820b?auto=format&fit=thumb&w=400&q=80', // Insurance Card
    },
  ]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'prescription',
    description: '',
    file: null as File | null,
  });

  // Filtered documents for the active tab
  const filteredDocs = activeTab === 'all'
    ? documents
    : documents.filter((doc) => doc.category === activeTab);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (name === 'file') {
      setForm((prev) => ({ ...prev, file: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle document upload (demo: just adds to state)
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.file) return;
    setUploading(true);
    setTimeout(() => {
      setDocuments((prev) => [
        {
          id: Date.now(),
          title: form.title,
          category: form.category,
          date: new Date().toISOString().split('T')[0],
          description: form.description,
          fileUrl: URL.createObjectURL(form.file!),
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=thumb&w=400&q=80', // Placeholder
        },
        ...prev,
      ]);
      setForm({ title: '', category: 'prescription', description: '', file: null });
      setUploading(false);
      setShowModal(false);
    }, 800);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Folder className="h-7 w-7 text-teal-600" /> Medical Digi Locker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Securely store and access all your medical documents in one place.
        </p>
      </div>

      {/* Add Document Button (top right) */}
      <div className="flex items-center justify-between mb-4">
        <div></div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow transition-all"
        >
          <FilePlus className="h-5 w-5" /> Add Document
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-100 ${
              activeTab === cat.key
                ? 'bg-teal-100 text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <cat.icon className="h-5 w-5 mr-2" /> {cat.label}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-7">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <FileText className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your first medical document!</p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const CatIcon = categories.find((c) => c.key === doc.category)?.icon || FileText;
            return (
              <div
                key={doc.id}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col justify-between hover:shadow-lg transition-all duration-150 group"
              >
                {/* Document Image */}
                <img
                  src={doc.imageUrl}
                  alt={doc.title}
                  className="w-full h-32 object-cover rounded-xl mb-4 border"
                  loading="lazy"
                />
                <div className="flex items-center mb-4">
                  <span className="p-2 rounded-lg bg-teal-100 mr-3">
                    <CatIcon className="h-5 w-5 text-teal-600" />
                  </span>
                  <span className="text-xs font-medium text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-1 rounded">
                    {categories.find((c) => c.key === doc.category)?.label || 'Other'}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-teal-700 transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-gray-500 mb-3 truncate">{doc.description}</p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">{doc.date}</span>
                  <a
                    href={doc.fileUrl}
                    download
                    className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-teal-50 text-teal-700 hover:bg-teal-100"
                  >
                    <DownloadCloud className="h-4 w-4 mr-1" /> Download
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Add Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 relative animate-fadeIn">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-600" /> Add Medical Document
            </h2>
            <form className="space-y-4" onSubmit={handleUpload}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md transition duration-150 ease-in-out"
                  required
                >
                  {categories.filter((c) => c.key !== 'all').map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Optional"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  name="file"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 sm:text-sm transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:text-sm transition-colors duration-150"
                >
                  {uploading ? 'Uploading...' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigiLocker;
