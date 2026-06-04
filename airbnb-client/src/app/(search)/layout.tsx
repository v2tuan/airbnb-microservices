<<<<<<< HEAD
import { Suspense } from "react";
import SearchHeader from "@/components/header/search-header";
=======
>>>>>>> origin/master
import MainLayout from "@/layouts/main-layout";
import SearchHeader from "@/components/header/search-header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
<<<<<<< HEAD
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
=======
    <MainLayout header={<SearchHeader />} headerVariant="main" showFooter={true}>
>>>>>>> origin/master
      {children}
    </MainLayout>
  );
}
