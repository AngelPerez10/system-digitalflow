import { HelmetProvider, Helmet } from "react-helmet-async";
import { useMarca } from "@/context/MarcaContext";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  const { nombre } = useMarca();
  const resolvedTitle = title
    .split("Sistema Grupo Intrax GPS")
    .join(nombre)
    .split("Sistema Grupo Intrax")
    .join(nombre)
    .split("Sistema Intrax")
    .join(nombre);

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
