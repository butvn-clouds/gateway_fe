import { useState, useEffect } from "react";

interface Field {
  name: string;
  label: string;
  type: "text" | "select" | "file" | "multiselect" | "password";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: any;
}

interface AddEditModalProps {
  show: boolean;
  title: string;
  fields: Field[];
  onSubmit: (data: any) => void | Promise<void>;
  onCancel: () => void;
}

export default function AddEditModal({
  show,
  title,
  fields,
  onSubmit,
  onCancel,
}: AddEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      const initial: any = {};
      fields.forEach((f) => {
        if (f.type === "multiselect") initial[f.name] = f.defaultValue || [];
        else initial[f.name] = f.defaultValue ?? (f.type === "file" ? null : "");
        if (f.type === "file" && f.defaultValue) setFilePreview(f.defaultValue);
      });
      setFormData(initial);
    }
  }, [fields, show]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));

    if (name === "logo" && value instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-[500px] p-6 relative">
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block mb-1 font-medium text-gray-700">
                {f.label}
              </label>

              {f.type === "text" && (
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={formData[f.name] || ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}

              {f.type === "password" && (
                <input
                  type="password"
                  placeholder={f.placeholder}
                  value={formData[f.name] || ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}

              {f.type === "select" && (
                <select
                  value={formData[f.name] ?? ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {f.placeholder ? f.placeholder : `Chọn ${f.label}`}
                  </option>
                  {f.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {f.type === "multiselect" && (
                <select
                  multiple
                  value={formData[f.name] || []}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value
                    );
                    handleChange(f.name, selected);
                  }}
                  className="w-full border px-3 py-2 rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                >
                  {f.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {f.type === "file" && (
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleChange(f.name, e.target.files?.[0] || null)
                    }
                    className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
                  />
                  {filePreview && (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-24 h-24 rounded object-cover border"
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
