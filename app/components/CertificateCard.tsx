import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  FileText,
  Link,
  Wallet,
  Tag,
  User,
  Hash,
} from "lucide-react";

interface Certificate {
  id: number;
  recipient_name: string;
  course_name: string;
  institution_name: string;
  recipient_wallet_address: string;
  issue_date: string;
  completion_date: string;
  description: string | null;
  txHash: string;
  created_at: string;
  object_id: string;
  name: string;
  url: string;
  issuer_address: string;
}

interface Transaction {
  id: number;
  user_id: number;
  transaction_type: string;
  txHash: string | null;
  status: boolean;
  description: string | null;
  created_at: string;
  wallet_address?: string;
}

interface CertificateCardProps {
  certificate: Certificate;
  transactionMap: Record<string, Transaction>;
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
    txHash,
    created_at,
    object_id,
    name,
    url,
    issuer_address,
  } = certificate;

  const createdAtDate = new Date(created_at);
  const formattedCreatedAt = isNaN(createdAtDate.getTime())
    ? "N/A"
    : createdAtDate.toLocaleDateString("vi-VN") +
      " " +
      createdAtDate.toLocaleTimeString("vi-VN");

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
            <div className="flex items-center text-gray-600">
              <Tag className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Tên Certificate</p>
                <p>{name || "N/A"}</p>
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
            <div className="flex items-start text-gray-600">
              <User className="h-4 w-4 mr-2 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Ví người cấp</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {shortenAddress(issuer_address)}
                  </span>
                  <button
                    onClick={() => onCopy(issuer_address)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Sao chép địa chỉ ví người cấp"
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
            {url && (
              <div className="flex items-start text-gray-600">
                <Link className="h-4 w-4 mr-2 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">URL Certificate</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {url}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            <div className="space-y-1">
              <p>
                <strong>ID:</strong> {id}
              </p>
              <p>
                <strong>Created At:</strong> {formattedCreatedAt}
              </p>
            </div>
            <div className="space-y-1">
              {object_id && (
                <p>
                  <strong>Object ID:</strong>{" "}
                  <span className="font-mono">{shortenAddress(object_id)}</span>
                  <button
                    onClick={() => onCopy(object_id)}
                    className="p-1 hover:bg-gray-200 rounded ml-1 align-middle"
                    title="Sao chép Object ID"
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
                </p>
              )}
              {txHash && (
                <p>
                  <strong>Tx Hash:</strong>{" "}
                  <span className="font-mono">{shortenAddress(txHash)}</span>
                  <button
                    onClick={() => onCopy(txHash)}
                    className="p-1 hover:bg-gray-200 rounded ml-1 align-middle"
                    title="Sao chép Transaction Hash"
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
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
