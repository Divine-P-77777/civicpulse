"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const TestPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">

            <div className="flex flex-col md:flex-row items-center gap-10 p-6 rounded-2xl shadow-xl bg-white">

                <DotLottieReact
                    src="https://lottie.host/53635bc2-9dd9-48ce-9231-ad0478168b0e/vbuHs1xbUF.lottie"
                    loop
                    autoplay
                    className="w-28 h-28 md:w-40 md:h-40"
                />

                <DotLottieReact
                    src="https://lottie.host/b96071ae-cfac-4b25-8c3d-00bcf79e5b6c/l03YOKLjjC.lottie"
                    loop
                    autoplay
                    className="w-28 h-28 md:w-40 md:h-40"
                />

            </div>
        </div>
    );
};

export default TestPage;