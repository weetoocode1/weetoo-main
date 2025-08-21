import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from "@react-email/components";

interface AdminOTPEmailProps {
  otpCode: string;
  adminName: string;
}

const AdminOTPEmail: React.FC<AdminOTPEmailProps> = ({
  otpCode,
  adminName = "Administrator",
}) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your WEETOO Admin Dashboard OTP Code</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="mx-auto bg-white rounded-[8px] shadow-lg max-w-[600px] overflow-hidden">
            {/* Header */}
            <Section className="bg-slate-900 px-[40px] py-[24px] text-center">
              <Heading className="text-[32px] font-medium text-white m-0 mb-[4px] tracking-[1px]">
                WEETOO
              </Heading>
              <Text className="text-[12px] text-slate-300 m-0">
                Admin Dashboard Access
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="px-[40px] py-[32px]">
              <Heading className="text-[18px] font-medium text-gray-900 mb-[20px] m-0">
                Your Security Code
              </Heading>

              <Text className="text-[15px] text-gray-800 mb-[12px] m-0">
                Hello {adminName},
              </Text>

              <Text className="text-[16px] text-gray-700 mb-[32px] m-0 leading-[24px]">
                Use this code to access your admin dashboard:
              </Text>

              {/* OTP Code */}
              <Section className="text-center mb-[32px]">
                <div className="bg-slate-50 border border-slate-200 rounded-[8px] px-[24px] py-[20px] inline-block">
                  <Text className="text-[10px] text-slate-600 m-0 mb-[6px] uppercase tracking-[1px]">
                    Access Code
                  </Text>
                  <Text className="text-[36px] font-mono font-medium text-slate-800 m-0 tracking-[4px]">
                    {otpCode}
                  </Text>
                </div>
              </Section>

              {/* Validity Info */}
              <Section className="bg-blue-50 border border-blue-200 rounded-[6px] px-[16px] py-[12px] mb-[24px]">
                <Text className="text-[15px] text-blue-800 m-0 font-medium mb-[4px]">
                  Valid for 24 hours
                </Text>
                <Text className="text-[14px] text-blue-700 m-0">
                  This code expires automatically after use.
                </Text>
              </Section>

              <Text className="text-[15px] text-gray-600 mb-[24px] m-0">
                If you didn't request this code, contact your system
                administrator.
              </Text>

              <Hr className="border-gray-300 my-[20px]" />

              {/* Security Notice */}
              <Section className="bg-red-50 border border-red-200 rounded-[6px] px-[16px] py-[12px]">
                <Text className="text-[14px] text-red-800 m-0 font-medium mb-[4px]">
                  Security Notice
                </Text>
                <Text className="text-[13px] text-red-700 m-0">
                  Never share this code. WEETOO will never ask for your OTP.
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-slate-50 px-[40px] py-[16px] border-t border-slate-200 text-center">
              <Text className="text-[11px] text-slate-500 m-0">
                © {new Date().getFullYear()} WEETOO
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AdminOTPEmail;
