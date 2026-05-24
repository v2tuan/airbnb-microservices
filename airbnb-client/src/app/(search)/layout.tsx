import MainLayout from "@/layouts/main-layout";
import SearchHeader from "@/components/header/search-header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout header={<SearchHeader />} headerVariant="main" showFooter={true}>
      {children}
    </MainLayout>
  );
}
