"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 relative bg-gradient-to-b from-blue-50 to-blue-100 dark:from-black dark:to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_50%)]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-4 py-1.5 text-sm">
            Start Your Journey
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Master Trading?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto px-4 sm:px-0">
            Join thousands of traders who are already learning and earning
            through our simulation platform.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 dark:text-white px-8 py-6 text-lg rounded-xl"
              asChild
            >
              <Link href="/trading">Get Started Now</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
