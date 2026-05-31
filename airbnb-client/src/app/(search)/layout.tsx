import { Suspense } from "react";
import SearchHeader from "@/components/header/search-header";
import MainLayout from "@/layouts/main-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout
      contentOffset="none"
      header={
        <Suspense fallback={null}>
          <SearchHeader />
        </Suspense>
      }
      headerVariant="main"
      showFooter={true}
    >
      {children}
    </MainLayout>
  );
}
