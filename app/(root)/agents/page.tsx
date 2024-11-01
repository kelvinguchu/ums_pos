import Agents from "@/components/Agents";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const AgentsPage = () => {
  return (
    <div
      className={`${geistMono.className} container mx-auto px-2 sm:px-4 mt-20 sm:mt-8`}>
      <h1 className='text-3xl font-bold mb-6 text-center'>UMS Kenya Agents</h1>
      <Agents />
    </div>
  );
};

export default AgentsPage;
