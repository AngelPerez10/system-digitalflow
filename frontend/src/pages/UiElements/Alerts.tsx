import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Alert from "../../components/ui/alert/Alert";
import PageMeta from "../../components/common/PageMeta";

export default function Alerts() {
  return (
    <>
      <PageMeta
        title="Alertas | Sistema Grupo Intrax GPS"
        description="Página de alertas para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Alertas" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Alerta de Éxito">
          <Alert
            variant="success"
            title="Success Message"
            message="Be cautious when performing this action."
            showLink={true}
            linkHref="/"
            linkText="Learn more"
          />
          <Alert
            variant="success"
            title="Success Message"
            message="Be cautious when performing this action."
            showLink={false}
          />
        </ComponentCard>
        <ComponentCard title="Alerta de Advertencia">
          <Alert
            variant="warning"
            title="Warning Message"
            message="Be cautious when performing this action."
            showLink={true}
            linkHref="/"
            linkText="Learn more"
          />
          <Alert
            variant="warning"
            title="Warning Message"
            message="Be cautious when performing this action."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Alerta de Error">
          <Alert
            variant="error"
            title="Error Message"
            message="Be cautious when performing this action."
            showLink={true}
            linkHref="/"
            linkText="Learn more"
          />
          <Alert
            variant="error"
            title="Error Message"
            message="Be cautious when performing this action."
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title="Alerta de Información">
          <Alert
            variant="info"
            title="Info Message"
            message="Be cautious when performing this action."
            showLink={true}
            linkHref="/"
            linkText="Learn more"
          />
          <Alert
            variant="info"
            title="Info Message"
            message="Be cautious when performing this action."
            showLink={false}
          />
        </ComponentCard>
      </div>
    </>
  );
}
