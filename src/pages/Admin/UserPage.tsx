import PageMeta from "../../components/common/PageMeta";
import CreateUserAdmin from "../../components/admin/CreateUsers";
export default function UserPage() {
  return (
    <>
      <PageMeta title="Admin - User Management" /> <CreateUserAdmin />
    </>
  );
}
