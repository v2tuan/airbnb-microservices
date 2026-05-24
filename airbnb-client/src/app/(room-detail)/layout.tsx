import MainLayout from "@/layouts/main-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout headerVariant="main" showFooter={true}>
      {children}
    </MainLayout>
  );
}
