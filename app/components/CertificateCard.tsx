import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Link, Wallet } from "lucide-react";

interface Certificate {
  id: number;
  recipient_name: string;
  course_name: string;
  institution_name: string;
  recipient_wallet_address: string;
  issue_date: string;
  completion_date: string;
  description: string | null;
  created_at: string;
}

interface CertificateCardProps {
  certificate: Certificate;
  transactionMap: Record<string, any>;
  onCopy: (text: string) => void;
}

const shortenAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function CertificateCard({
  certificate,
  transactionMap,
  onCopy,
}: CertificateCardProps) {
  const {
    id,
    recipient_name,
    course_name,
    institution_name,
    recipient_wallet_address,
    issue_date,
    completion_date,
    description,
  } = certificate;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {course_name}
            </h3>
            <p className="text-sm text-gray-600">
              Người nhận: {recipient_name}
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {institution_name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {/* Thông tin chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Ngày cấp</p>
                <p>{new Date(issue_date).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Ngày hoàn thành</p>
                <p>{new Date(completion_date).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start text-gray-600">
              <Wallet className="h-4 w-4 mr-2 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Ví người nhận</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {shortenAddress(recipient_wallet_address)}
                  </span>
                  <button
                    onClick={() => onCopy(recipient_wallet_address)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Sao chép địa chỉ ví"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {description && (
              <div className="flex items-start text-gray-600">
                <FileText className="h-4 w-4 mr-2 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">Mô tả</p>
                  <p className="text-sm">{description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction info */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">ID: {id}</span>
            <div className="flex items-center gap-2">
              {Object.entries(transactionMap).map(
                ([txHash, tx]: [string, any]) => {
                  const description = tx.description || "";
                  if (
                    description.includes(recipient_name) &&
                    description.includes(course_name)
                  ) {
                    return (
                      <div key={txHash} className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                          <span className="font-mono text-xs">
                            {shortenAddress(txHash)}
                          </span>
                          <button
                            onClick={() => onCopy(txHash)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Sao chép transaction hash"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              ></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                        <a
                          href={`https://suiexplorer.com/txblock/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                        >
                          <Link className="h-3 w-3" />
                          <span>Xem giao dịch</span>
                        </a>
                      </div>
                    );
                  }
                  return null;
                }
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
