import React, { useEffect, useState } from "react";

type FieldType = "text" | "password" | "select" | "multiselect";

interface Option {
  label: string;
  value: string | number;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: any;
  options?: Option[];
  dependsOn?: string;
  optionsFn?: (formValues: Record<string, any>) => Option[];
}

interface AddEditModalProps {
  show: boolean;
  title: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  onCancel: () => void;
}

const AddEditModal: React.FC<AddEditModalProps> = ({
  show,
  title,
  fields,
  onSubmit,
  onCancel,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      const initialValues: Record<string, any> = {};
      fields.forEach((f) => {
        if (typeof f.defaultValue !== "undefined") {
          initialValues[f.name] = f.defaultValue;
        } else {
          if (f.type === "multiselect") initialValues[f.name] = [];
          else initialValues[f.name] = "";
        }
      });
      setFormValues(initialValues);
      setSubmitting(false);
    }
  }, [show, fields]);

  if (!show) return null;

  const handleChange = (
    name: string,
    value: any,
    _fieldType: FieldType
  ) => {
    setFormValues((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "accountIds") {
        next["virtualAccountIds"] = [];
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(formValues);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formValues[field.name];

    const options: Option[] = field.optionsFn
      ? field.optionsFn(formValues) || []
      : field.options || [];

    const disabledByDepends =
      !!field.dependsOn &&
      (!formValues[field.dependsOn] ||
        (Array.isArray(formValues[field.dependsOn]) &&
          formValues[field.dependsOn].length === 0));

    switch (field.type) {
      case "text":
      case "password":
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <input
              type={field.type}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={field.placeholder}
              value={value ?? ""}
              onChange={(e) =>
                handleChange(field.name, e.target.value, field.type)
              }
            />
          </div>
        );

      case "select":
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={value ?? ""}
              onChange={(e) =>
                handleChange(field.name, e.target.value, field.type)
              }
            >
              {field.placeholder && (
                <option value="">{field.placeholder}</option>
              )}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "multiselect":
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <select
              multiple
              disabled={disabledByDepends}
              className="w-full rounded-md border px-3 py-2 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              value={Array.isArray(value) ? value.map(String) : []}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions
                ).map((opt) => opt.value);
                handleChange(field.name, selected, field.type);
              }}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {disabledByDepends && (
              <p className="text-xs text-gray-400 mt-1">
                Vui lòng chọn account trước.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg">
        <div className="px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {fields.map((f) => renderField(f))}
          </div>

          <div className="px-5 py-3 border-t flex justify-end gap-2 bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditModal;
