import React, { useState } from "react";
import Card from "../components/Card";
import CardContent from "../components/CardContent";
import Input from "../components/Input";
import Button from "../components/Button";
import Carousel from "../components/Carousel";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Define carousel images
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

    if (!email.trim()) {
      toast.error("Please enter an email address", {
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

    setIsLoading(true);

    try {
      const response = await axios.post(
        "https://nss.cocobod.net/auth/request-forgot-password",
        { email },
      );

      toast.success(
        response.data.message ||
          "If an account exists, a reset link will be sent",
        {
          position: "top-right",
          autoClose: 3000,
        },
      );

      setTimeout(() => navigate(-1), 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send reset link. Please try again.";
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row justify-center w-full min-h-screen relative">
      {/* Toast Container */}
      <ToastContainer />
      {/* Background Image Carousel */}
      <Carousel images={images} />

      {/* Login Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 md:p-6">
          {/* Logos and Welcome Text */}
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
              Forgot your password?
            </h1>
            <h3 className="font-['Figtree',sans-serif] font-normal text-black text-xs sm:text-xs md:text-xs tracking-[-0.3px] sm:tracking-[-0.36px] p-4 md:tracking-[-0.42px]">
              Enter your email so that we can send you password reset link
            </h3>
          </div>

          {/* Login Form */}
          <form
            className="flex flex-col gap-3 sm:gap-4 md:gap-5"
            onSubmit={handleSubmit}
          >
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
            <Button
              className="cursor-pointer"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Email"}
            </Button>
            <div className="text-right">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(-1);
                }}
                className="font-['Figtree',sans-serif] text-xs sm:text-sm text-[#5b3418] hover:underline"
              >
                Back to login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
