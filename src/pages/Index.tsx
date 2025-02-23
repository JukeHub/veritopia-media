import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Book, Eye } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import { useUser } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-verilens-50 to-white dark:from-verilens-900 dark:to-black z-0" />
        <div className="section-container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-verilens-100 dark:bg-verilens-900 text-verilens-800 dark:text-verilens-100 text-sm font-medium mb-6">
              Welcome to VeriLens
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-verilens-800 to-verilens-600 bg-clip-text text-transparent dark:from-verilens-100 dark:to-verilens-300">
              Navigate News with Clarity
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Discover unbiased news analysis powered by AI. Enhance your media literacy and make informed decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-verilens-600 hover:bg-verilens-700 text-white"
                onClick={() => !user && setIsAuthModalOpen(true)}
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-verilens-600 text-verilens-600 hover:bg-verilens-50"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-900">
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Why Choose VeriLens?
            </motion.h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience news consumption reimagined through the lens of technology and education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Eye,
                title: "AI-Powered Analysis",
                description: "Get instant bias detection and smart summaries for every article.",
              },
              {
                icon: Shield,
                title: "Verified Sources",
                description: "Access news from trusted and verified sources worldwide.",
              },
              {
                icon: Book,
                title: "Educational Modules",
                description: "Learn media literacy through interactive lessons and quizzes.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-verilens-100 dark:bg-verilens-900 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-verilens-600 dark:text-verilens-300" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-verilens-600 dark:bg-verilens-800">
        <div className="section-container">
          <div className="text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your News Experience?
              </h2>
              <p className="mb-8 text-verilens-100 max-w-2xl mx-auto">
                Join VeriLens today and start your journey towards more informed and conscious news consumption.
              </p>
              <Button
                size="lg"
                className="bg-white text-verilens-600 hover:bg-verilens-50"
                onClick={() => !user && setIsAuthModalOpen(true)}
              >
                {user ? 'Go to Dashboard' : 'Start Now'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
