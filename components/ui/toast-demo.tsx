"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ToastDemo() {
  const handleSuccess = () => {
    toast.success("Operation completed successfully!", {
      description: "Your changes have been saved.",
      duration: 5000,
    });
  };

  const handleError = () => {
    toast.error("Something went wrong!", {
      description: "Please try again or contact support.",
      duration: 6000,
    });
  };

  const handleWarning = () => {
    toast.warning("Please review your input", {
      description: "Some fields may need attention.",
      duration: 5000,
    });
  };

  const handleInfo = () => {
    toast.info("New update available", {
      description: "Version 2.0 is now available for download.",
      duration: 4000,
      action: {
        label: "Update Now",
        onClick: () => console.log("Update clicked"),
      },
    });
  };

  const handleLoading = () => {
    // const loadingId = toast.loading("Processing your request...", {
    //   description: "This may take a few moments.",
    // });

    // Simulate completion after 3 seconds
    setTimeout(() => {
      toast.success("Request completed!", {
        description: "Your data has been processed successfully.",
      });
    }, 3000);
  };

  const handlePromise = () => {
    const fakePromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          resolve("Success!");
        } else {
          reject(new Error("Random failure"));
        }
      }, 2000);
    });

    toast.promise(fakePromise, {
      loading: "Processing...",
      success: "Operation completed successfully!",
      error: "Operation failed. Please try again.",
    });
  };

  const handleDismissAll = () => {
    toast.dismiss();
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Toast System Demo</h2>
      <p className="text-gray-600 mb-6">
        Test the new global toast system with different types and options.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Button
          onClick={handleSuccess}
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Success Toast
        </Button>

        <Button onClick={handleError} variant="destructive">
          Error Toast
        </Button>

        <Button
          onClick={handleWarning}
          variant="outline"
          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
        >
          Warning Toast
        </Button>

        <Button
          onClick={handleInfo}
          variant="outline"
          className="border-blue-500 text-blue-700 hover:bg-blue-50"
        >
          Info Toast
        </Button>

        <Button
          onClick={handleLoading}
          variant="outline"
          className="border-gray-500 text-gray-700 hover:bg-gray-50"
        >
          Loading Toast
        </Button>

        <Button
          onClick={handlePromise}
          variant="outline"
          className="border-purple-500 text-purple-700 hover:bg-purple-50"
        >
          Promise Toast
        </Button>
      </div>

      <div className="pt-4">
        <Button onClick={handleDismissAll} variant="secondary" size="sm">
          Dismiss All Toasts
        </Button>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Multiple toast types (success, error, warning, info, loading)
          </li>
          <li>• Customizable duration and descriptions</li>
          <li>• Action buttons for interactive toasts</li>
          <li>• Non-dismissible toasts for important messages</li>
          <li>• Promise-based toasts for async operations</li>
          <li>• Global positioning and management</li>
          <li>• Smooth animations and transitions</li>
        </ul>
      </div>
    </div>
  );
}
