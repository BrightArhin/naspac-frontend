import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Card from "../components/Card";
import CardContent from "../components/CardContent";
import Input from "../components/Input";
import Button from "../components/Button";
import Carousel from "../components/Carousel";

const Onboarding: React.FC = () => {
  const [nssNumber, setNssNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // New state for phone number
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const goFullScreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("Fullscreen request failed:", err);
        });
      }
    };
    goFullScreen();

    const trapNavigation = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", trapNavigation);

    const preventContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);

    const preventShortcuts = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.altKey ||
        ["F12", "Escape"].includes(e.key) ||
        (e.metaKey && ["t", "n", "r"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", preventShortcuts);

    return () => {
      window.removeEventListener("popstate", trapNavigation);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventShortcuts);
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          .catch((err) => console.log("Exit fullscreen failed:", err));
      }
    };
  }, []);

  const images: string[] = [
    "/carousel-image-1.jpg",
    "/carousel-image-2.jpg",
    "/carousel-image-3.jpg",
    "/carousel-image-4.png",
    "/carousel-image-5.jpg",
    "/carousel-image-6.jpg",
    "/carousel-image-7.jpg",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nssNumber.trim()) {
      toast.error("Please enter an NSS Number", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast.error(
        "Please enter a valid phone number (10-15 digits, optional +)",
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("You must be logged in to initiate onboarding", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/staff-login");
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setShowModal(false);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "/auth/init-onboarding",
        { nssNumber, email, phoneNumber },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 20000,
        },
      );

      toast.success(
        response.data.message || "Onboarding link sent successfully!",
        {
          position: "top-right",
          autoClose: 2000,
        },
      );

      setNssNumber("");
      setEmail("");
      setPhoneNumber(""); // Clear phone number field
    } catch (error: any) {
      const errorMessage =
        error.code === "ECONNABORTED"
          ? "Onboarding did not finish. The email service did not respond."
          : error.response?.data?.message ||
            "Failed to initiate onboarding. Please try again.";
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
      });

      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.", {
          position: "top-right",
          autoClose: 3000,
        });
        localStorage.removeItem("token");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <div className="flex flex-row justify-center w-full min-h-screen relative onboarding-container">
      <ToastContainer />
      <Carousel images={images} />
      <Card>
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col items-center mb-3 sm:mb-3 md:mb-4">
            <div className="flex justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-2 md:mb-3">
              <img
                className="w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] md:w-[60px] md:h-[60px] object-cover"
                alt="Naspac LOGO"
                src="/naspac-logo.png"
              />
              <img
                className="w-[38px] h-[36px] sm:w-[48px] sm:h-[46px] md:w-[58px] md:h-[56px] mt-[1px] sm:mt-[2px]"
                alt="NSS logo"
                src="/nss-logo.png"
              />
            </div>
            <h1 className="font-['Figtree',sans-serif] font-semibold text-black text-xl sm:text-2xl md:text-[28px] tracking-[-0.3px] sm:tracking-[-0.36px] md:tracking-[-0.42px]">
              Onboarding
            </h1>
          </div>
          <form
            className="flex flex-col gap-3 sm:gap-4 md:gap-5"
            onSubmit={handleSubmit}
          >
            <Input
              className="text-black font-normal"
              placeholder="NSS Number*"
              type="text"
              value={nssNumber}
              onChange={(e) => setNssNumber(e.target.value)}
              icon={
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#7c838d]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
            />
            <Input
              className="text-black font-normal"
              placeholder="Email*"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#7c838d]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 4H8a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M22 6l-10 7L2 6"
                  />
                </svg>
              }
            />
            <Input
              className="text-black font-normal"
              placeholder="Phone Number*"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              icon={
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#7c838d]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              }
            />
            <Button
              className="cursor-pointer"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-[30px] flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="font-['Figtree',sans-serif] font-semibold text-black text-xl text-center mb-4">
              Confirm Details
            </h2>
            <p className="text-black mb-2">
              <strong>NSS Number:</strong> {nssNumber}
            </p>
            <p className="text-black mb-2">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-black mb-6">
              <strong>Phone Number:</strong> {phoneNumber}
            </p>
            <p className="text-black mb-6">
              Are you sure you want to proceed with these details?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="font-['Figtree',sans-serif] text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="font-['Figtree',sans-serif] text-sm bg-[#5b3418] text-white px-4 py-2 rounded hover:bg-[#7c838d] cursor-pointer"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
