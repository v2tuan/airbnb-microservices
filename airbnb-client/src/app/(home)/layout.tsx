import MainLayout from "@/layouts/main-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout contentOffset="large" headerVariant="main">
      {children}
    </MainLayout>
  );
}
