import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "@/components/auth/SignInForm";
import { useMarca } from "@/context/MarcaContext";

export default function SignIn() {
  const { nombre } = useMarca();
  return (
    <>
      <PageMeta
        title={`Iniciar sesión | ${nombre}`}
        description="Inicio de sesión del sistema"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
