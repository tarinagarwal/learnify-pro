import React, { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth", // This enables smooth scrolling
    });
  }, [pathname]);

  return null;
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ScrollToTop />
      <main className="flex-grow pt-16">
        <Outlet />
      </main>
      <footer className="bg-gray-950 border-t border-[#777696] text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Learnify</h3>
            <p className="mb-4">
              Transforming education through AI and interactive learning
              experiences.
            </p>
            <div className="flex space-x-4">
              {/* Social icons would go here */}
            </div>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Features</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/quiz"
                  className="hover:text-purple-400 transition-colors"
                >
                  Interactive Quizzes
                </Link>
              </li>
              <li>
                <Link
                  to="/courses"
                  className="hover:text-purple-400 transition-colors"
                >
                  Courses
                </Link>
              </li>
              <li>
                <Link
                  to="/resources"
                  className="hover:text-purple-400 transition-colors"
                >
                  PDF Tools
                </Link>
              </li>
              <li>
                <Link
                  to="/roadmaps"
                  className="hover:text-purple-400 transition-colors"
                >
                  Learning Roadmaps
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="hover:text-purple-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
              {/* <li>
                <Link
                  to="/blog"
                  className="hover:text-purple-400 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="hover:text-purple-400 transition-colors"
                >
                  Careers
                </Link>
              </li> */}
              <li>
                <Link
                  to="/contact"
                  className="hover:text-purple-400 transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="https://tarinagarwal.in/"
                  className="hover:text-purple-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Developer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="hover:text-purple-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="hover:text-purple-400 transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center">
          <p>© {new Date().getFullYear()} Learnify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
