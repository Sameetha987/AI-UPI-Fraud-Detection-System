import Navbar from "../../components/layout/Navbar";
import Hero from "../../components/home/Hero";
import Footer from "../../components/layout/Footer";

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}

export default LandingPage;