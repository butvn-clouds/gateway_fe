import { useState, useEffect } from "react";

interface FieldOption {
  label: string;
  value: string | number;
}

interface Field {
  name: string;
  label: string;
  type: "text" | "select" | "file" | "multiselect" | "password";
  placeholder?: string;
  options?: FieldOption[];
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
        if (f.type === "multiselect") {
          initial[f.name] = f.defaultValue || [];
        } else if (f.type === "file") {
          initial[f.name] = null;
          if (f.defaultValue) {
            setFilePreview(f.defaultValue);
          }
        } else {
          initial[f.name] = f.defaultValue ?? "";
        }
      });
      setFormData(initial);
    } else {
      // reset preview khi đóng modal
      setFilePreview(null);
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
      <div className="bg-custom rounded-xl w-[500px] p-6 relative">
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
                  value={formData[f.name] ?? ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}

              {f.type === "password" && (
                <input
                  type="password"
                  placeholder={f.placeholder}
                  value={formData[f.name] ?? ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}

              {f.type === "select" && (
                <select
                  value={
                    formData[f.name] !== undefined && formData[f.name] !== null
                      ? String(formData[f.name])
                      : ""
                  }
                  onChange={(e) => {
                    const selected = e.target.value;
                    const opt = f.options?.find(
                      (o) => String(o.value) === selected
                    );
                    handleChange(f.name, opt ? opt.value : selected);
                  }}
                  className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {f.placeholder ? f.placeholder : `Chọn ${f.label}`}
                  </option>
                  {f.options?.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {f.type === "multiselect" && (
                <select
                  multiple
                  value={
                    Array.isArray(formData[f.name])
                      ? formData[f.name].map((v: any) => String(v))
                      : []
                  }
                  onChange={(e) => {
                    const selectedValues = Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value
                    );
                    const resolved = selectedValues.map((val) => {
                      const opt = f.options?.find(
                        (o) => String(o.value) === val
                      );
                      return opt ? opt.value : val;
                    });
                    handleChange(f.name, resolved);
                  }}
                  className="w-full border px-3 py-2 rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                >
                  {f.options?.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
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
