"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building,
  Wallet,
  Plus,
  FileQuestion,
  RefreshCw,
  Search,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiObjectResponse } from "@mysten/sui/client";
import { client } from "../lib/suiClient"; // Đường dẫn có thể cần điều chỉnh
import InstitutionList from "@/components/InstitutionList";
import { PACKAGE_ID, MODULE_NAME } from "@/constants/contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import CertificateCard from "@/app/components/CertificateCard";

// Add interfaces for types
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

interface Institution {
  id: number;
  institution_name: string;
  email: string;
  website: string;
  wallet_address: string;
  created_at: string;
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

// Export interface để có thể dùng ở component khác
export type { Institution, Certificate, Transaction };

export default function HomePage() {
  const { currentAccount, signAndExecuteTransactionBlock } = useWalletKit();
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [userInstitution, setUserInstitution] = useState<Institution | null>(
    null
  );
  const [filteredCertificates, setFilteredCertificates] = useState<
    Certificate[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [transactionMap, setTransactionMap] = useState<
    Record<string, Transaction>
  >({});

  // Khởi tạo state cho form tạo certificate
  const defaultCertificateForm = {
    recipient_name: "",
    course_name: "",
    institution: "",
    issue_date: "",
    completion_date: "",
    description: "",
    recipient_address: "",
    name: "",
    url: "",
  };

  const [certificateForm, setCertificateForm] = useState(
    defaultCertificateForm
  );

  // Thêm state mới để lưu trữ file ảnh
  const [certificateImageFile, setCertificateImageFile] = useState<File | null>(
    null
  );

  // Thêm hàm kiểm tra ví người nhận
  const validateRecipientAddress = (address: string) => {
    if (!currentAccount) return false;
    return address.toLowerCase() !== currentAccount.address.toLowerCase();
  };

  // --- Define all functions first (including those used in useEffect) ---

  const fetchCertificates = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const response = await fetch("/api/certificates");
      const data = await response.json();

      if (!data.success) {
        console.error("Error fetching certificates:", data.error);
        return;
      }

      if (Array.isArray(data.certificates)) {
        setCertificates(data.certificates);
        console.log("Fetched certificates:", data.certificates.length);
      } else {
        console.error("Invalid certificates data format:", data);
        setCertificates([]);
      }

      try {
        const objects = await client.getOwnedObjects({
          owner: currentAccount.address,
          options: { showContent: true, showType: true },
        });
        const nftObjects = objects.data.filter((obj: SuiObjectResponse) => {
          const type = obj.data?.type;
          return type && type.includes("devnet_nft::DevNetNFT");
        });
        console.log("Found NFTs on chain:", nftObjects.length);
      } catch (chainError) {
        console.error("Error fetching from chain:", chainError);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      setCertificates([]);
    }
  }, [currentAccount]);

  const fetchInstitutions = useCallback(async () => {
    try {
      const response = await fetch("/api/institutions");
      const data = await response.json();
      setInstitutions(data.institutions || []);
    } catch (error) {
      console.error("Error fetching institutions:", error);
    }
  }, []);

  const fetchTransaction = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions?type=mint_certificate");
      const data = await response.json();
      if (data.success && data.transactions) {
        const txMap = data.transactions.reduce(
          (acc: Record<string, Transaction>, tx: Transaction) => {
            if (tx.txHash && tx.description?.includes("Mint certificate for")) {
              acc[tx.txHash] = tx;
            }
            return acc;
          },
          {}
        );
        setTransactionMap(txMap);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, []);

  const checkUserInstitution = useCallback(async () => {
    if (!currentAccount) return;
    try {
      console.log(
        "[Frontend] Checking user institution for wallet:",
        currentAccount.address
      );
      const response = await fetch(
        `/api/institutions?wallet_address=${currentAccount.address}`
      );
      const data = await response.json();
      console.log("[Frontend] Institution check response:", data);

      if (data.institution) {
        console.log("[Frontend] Found institution:", data.institution);
        const userInfo = data.institution;
        const userInstitution = {
          id: userInfo.id,
          institution_name: userInfo.institution_name,
          email: userInfo.email,
          website: userInfo.website,
          wallet_address: currentAccount.address,
          created_at: userInfo.created_at,
        };
        setUserInstitution(userInstitution);
      } else {
        console.log("[Frontend] No institution found");
        setUserInstitution(null);
      }
    } catch (error) {
      console.error("[Frontend] Error checking institution:", error);
      setUserInstitution(null);
    }
  }, [currentAccount]);

  const fetchUser = useCallback(async (wallet_address: string) => {
    try {
      const response = await fetch(
        `/api/users?wallet_address=${wallet_address}`
      );
      const data = await response.json();
      if (!response.ok) {
        console.error("Error fetching user:", data.error);
        return null;
      }
      return data.user;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

  const createUser = useCallback(async (wallet_address: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Error creating user:", data.error);
        return null;
      }
      return data.user;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  }, []);

  const createInstitutionCap = useCallback(
    async (institutionName: string) => {
      if (!currentAccount) {
        alert("Vui lòng kết nối ví Sui trước");
        return;
      }
      try {
        const tx = new TransactionBlock();
        tx.moveCall({
          target: `${PACKAGE_ID}::${MODULE_NAME}::create_institution_cap`,
          arguments: [tx.pure(institutionName)],
        });

        const result = await signAndExecuteTransactionBlock({
          transactionBlock: tx as unknown as Parameters<
            typeof signAndExecuteTransactionBlock
          >[0]["transactionBlock"],
        });

        if (!result) {
          throw new Error("Transaction failed");
        }

        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: currentAccount.address,
            transaction_type: "create_institution",
            txHash: result.digest,
            status: true,
            description: `Create institution: ${institutionName}`,
          }),
        });

        return result;
      } catch (error) {
        console.error("Error creating institution capability:", error);
        throw error;
      }
    },
    [currentAccount, signAndExecuteTransactionBlock]
  );

  const filterCertificates = useCallback(() => {
    // Use certificates, defaulting to an empty array if it's not a valid array
    const certsToProcess = Array.isArray(certificates) ? certificates : [];
    let filtered = [...certsToProcess]; // Now safe to spread certsToProcess

    if (searchTerm) {
      filtered = filtered.filter(
        (cert) =>
          cert.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.recipient_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          cert.institution_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          cert.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedInstitution && selectedInstitution !== "all") {
      filtered = filtered.filter(
        (cert) => cert.institution_name === selectedInstitution
      );
    }

    if (dateRange.start) {
      filtered = filtered.filter(
        (cert) => new Date(cert.issue_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (cert) => new Date(cert.issue_date) <= new Date(dateRange.end)
      );
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, selectedInstitution, dateRange]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Define useEffect hooks (now functions are defined before) ---

  useEffect(() => {
    if (currentAccount) {
      const fetchData = async () => {
        await Promise.all([
          fetchCertificates(),
          fetchInstitutions(),
          checkUserInstitution(),
          fetchTransaction(),
        ]);
      };
      fetchData();
    }
  }, [
    currentAccount,
    fetchCertificates,
    fetchInstitutions,
    checkUserInstitution,
    fetchTransaction,
  ]);

  useEffect(() => {
    const initializeUser = async () => {
      if (currentAccount) {
        const existingUser = await fetchUser(currentAccount.address);
        if (!existingUser) {
          console.log("Creating new user for wallet:", currentAccount.address);
          await createUser(currentAccount.address);
        }
      }
    };
    initializeUser();
  }, [currentAccount, fetchUser, createUser]);

  useEffect(() => {
    if (currentAccount) {
      console.log("[Frontend] Wallet connected, checking institution...");
      checkUserInstitution();
    } else {
      console.log("[Frontend] No wallet connected, clearing institution");
      setUserInstitution(null);
    }
  }, [currentAccount, checkUserInstitution]);

  useEffect(() => {
    filterCertificates();
    // Dependencies should be states that affect filtering, not the function itself
  }, [certificates, searchTerm, selectedInstitution, dateRange]);

  const handleCertificateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra địa chỉ người nhận
    if (!validateRecipientAddress(certificateForm.recipient_address)) {
      alert("Không thể tạo certificate cho chính ví của bạn");
      return;
    }

    if (!currentAccount) {
      alert("Vui lòng kết nối ví Sui trước");
      return;
    }

    // Kiểm tra institution
    if (!userInstitution) {
      alert(
        "Bạn cần đăng ký tổ chức (Institution) trước khi tạo certificate!\n\n" +
          "Vui lòng:\n" +
          "1. Chuyển đến tab 'Register Institution'\n" +
          "2. Điền thông tin tổ chức của bạn\n" +
          "3. Đăng ký tổ chức\n" +
          "4. Sau đó quay lại tạo certificate"
      );
      return;
    }

    // Kiểm tra institution trong form có khớp với institution đã đăng ký không
    if (certificateForm.institution !== userInstitution.institution_name) {
      alert(
        `Tên tổ chức không khớp với tổ chức đã đăng ký!\n\n` +
          `Tổ chức đã đăng ký: ${userInstitution.institution_name}\n` +
          `Vui lòng sử dụng đúng tên tổ chức đã đăng ký.`
      );
      return;
    }

    setLoading(true);
    try {
      const tx = new TransactionBlock();

      // Tạo tên certificate từ tên khóa học và người nhận
      const certificateName = `${certificateForm.course_name} - ${certificateForm.recipient_name}`;
      // Tạo URL certificate (placeholder)
      // Lý tưởng là URL đến trang xem certificate chi tiết, có thể dùng object ID.
      // Cần cập nhật logic này sau khi có objectId nếu URL phụ thuộc vào ID.
      const certificateUrl = `https://your-app.com/certificates/`; // Placeholder, cần thêm objectId sau khi mint nếu cần

      // Log trước khi tạo transaction
      console.log("Form data:", certificateForm);
      console.log("Generated Metadata:", {
        name: certificateName,
        // url: certificateUrl, // Không sử dụng certificateUrl tạo từ frontend nữa
      }); // Log metadata được tạo

      const moveCall = {
        target: `${PACKAGE_ID}::${MODULE_NAME}::mint_certificate` as const,
        arguments: [
          tx.pure(certificateForm.recipient_name || ""),
          tx.pure(certificateForm.course_name || ""),
          tx.pure(certificateForm.institution || ""),
          tx.pure(certificateForm.issue_date || ""),
          tx.pure(certificateForm.completion_date || ""),
          tx.pure(certificateForm.description || "Digital Certificate"),
          tx.pure(certificateName), // <-- Thêm tham số name
          tx.pure(certificateForm.url), // <-- Vẫn truyền certificateForm.url (sẽ rỗng lúc đầu)
          tx.pure(certificateForm.recipient_address || currentAccount.address),
        ],
      };
      console.log("Move call details:", moveCall);
      tx.moveCall(moveCall);

      // Log transaction trước khi gửi
      console.log("Transaction before signing:", tx.serialize());

      // Ký và thực thi transaction
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx as unknown as Parameters<
          typeof signAndExecuteTransactionBlock
        >[0]["transactionBlock"],
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
        },
      });
      console.log("Transaction result:", result);

      console.log("Certificate minted successfully, digest:", result.digest);

      // --- START: Find Object ID by fetching owned objects ---
      let objectId: string | undefined;

      if (currentAccount && result.digest) {
        try {
          console.log(
            "Attempting to find minted object for recipient:",
            certificateForm.recipient_address
          );
          // Fetch objects owned by the recipient
          const ownedObjects = await client.getOwnedObjects({
            owner: certificateForm.recipient_address,
            options: {
              showContent: true, // Cần để kiểm tra type
              showType: true,
            },
          });

          console.log("Owned objects fetched:", ownedObjects);

          // Filter to find the newly minted Certificate object
          const mintedObject = ownedObjects.data.find(
            (obj: SuiObjectResponse) => {
              // Kiểm tra nếu object tồn tại, có data, và có type
              const objectType = obj.data?.type;
              if (obj.data && objectType) {
                // Kiểm tra xem type có khớp với Certificate NFT của chúng ta không
                // Định dạng type thường là PACKAGE_ID::MODULE_NAME::STRUCT_NAME
                const expectedType = `${PACKAGE_ID}::${MODULE_NAME}::Certificate`;
                // So sánh type (có thể cần điều chỉnh so sánh type tùy theo cách Sui hiển thị)
                // Đôi khi có phiên bản module đi kèm trong type, ví dụ: 0x...::digital_certificate::Certificate:0:1
                // Nên kiểm tra includes hoặc regex nếu so sánh chính xác không hoạt động
                if (objectType.includes(expectedType)) {
                  // Đây có thể là Certificate NFT.
                  // Để chắc chắn hơn, có thể so sánh thêm các trường nội dung
                  // nếu chúng có sẵn và duy nhất (ví dụ: recipient_name, course_name)
                  // Tuy nhiên, API getOwnedObjects with showContent không phải lúc nào cũng trả về đầy đủ content ngay lập tức
                  // Chúng ta tạm thời dựa vào type và giả định đối tượng mới nhất có type này là đúng
                  return true; // Tìm thấy đối tượng có type khớp
                }
              }
              return false; // Không khớp tiêu chí
            }
          );

          if (mintedObject?.data?.objectId) {
            objectId = mintedObject.data.objectId;
            console.log("Successfully found minted Object ID:", objectId);
          } else {
            console.error(
              "Could not find minted Certificate object among owned objects."
            );
          }
        } catch (fetchOwnedError) {
          console.error(
            "Error fetching owned objects to find minted ID:",
            fetchOwnedError
          );
        }
      }

      // --- END: Find Object ID by fetching owned objects ---

      // Kiểm tra nếu không lấy được objectId (bằng cách fetch owned objects)
      if (!objectId) {
        console.error(
          "Could not get Object ID after attempting to find among owned objects. Transaction result:",
          result
        );
        alert(
          "Certificate minted on chain, but could not retrieve Object ID from owned objects."
        );
        setLoading(false); // Dừng loading
        return; // Dừng xử lý tiếp nếu không có objectId
      }

      console.log("Minted Object ID (found among owned objects):\n", objectId); // Log objectId đã tìm được

      // Chuẩn bị FormData để gửi đến API backend
      const formData = new FormData();
      formData.append("object_id", objectId);
      formData.append("recipient_name", certificateForm.recipient_name);
      formData.append("course_name", certificateForm.course_name);
      formData.append("institution_name", certificateForm.institution);
      formData.append(
        "recipient_wallet_address",
        certificateForm.recipient_address
      );
      formData.append("issue_date", certificateForm.issue_date);
      formData.append("completion_date", certificateForm.completion_date);
      formData.append("description", certificateForm.description || "");
      formData.append("name", certificateName);
      formData.append("issuer_address", currentAccount.address);
      formData.append("transaction_hash", result?.digest || "");

      // Thêm file ảnh vào FormData nếu có
      if (certificateImageFile) {
        formData.append("image", certificateImageFile);
        // Không gửi URL khi có file ảnh vì backend sẽ tạo URL từ file
      } else if (certificateForm.url) {
        // Chỉ gửi URL nếu có giá trị và không có file ảnh
        formData.append("url", certificateForm.url);
      }

      // Lưu certificate vào cơ sở dữ liệu qua API
      console.log("Sending certificate data:", {
        object_id: objectId,
        recipient_name: certificateForm.recipient_name,
        course_name: certificateForm.course_name,
        institution_name: certificateForm.institution,
        recipient_wallet_address: certificateForm.recipient_address,
        issue_date: certificateForm.issue_date,
        completion_date: certificateForm.completion_date,
        description: certificateForm.description,
        name: certificateName,
        url: certificateForm.url,
        issuer_address: currentAccount.address,
        transaction_hash: result?.digest,
        has_image: !!certificateImageFile,
      });

      const response = await fetch("/api/certificates", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const successMessage = `
          Certificate đã được tạo thành công!
          
          Thông tin certificate:
          - Người nhận: ${certificateForm.recipient_name}
          - Khóa học: ${certificateForm.course_name}
          - Tổ chức: ${certificateForm.institution}
          - Ngày cấp: ${certificateForm.issue_date}
          - Ngày hoàn thành: ${certificateForm.completion_date}
          - Tên NFT: ${certificateName}
          - URL NFT: ${certificateUrl}
          - Mã giao dịch: ${result?.digest || "N/A"}
          - Object ID: ${objectId}
        `;
        alert(successMessage);
        setCertificateForm(defaultCertificateForm);
        fetchCertificates();

        // Ghi nhận hành động mint certificate
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: currentAccount.address,
            transaction_type: "mint_certificate",
            txHash: result.digest,
            status: true,
            description: `Mint certificate for ${certificateForm.recipient_name} - ${certificateForm.course_name} (Object ID: ${objectId})`,
          }),
        });
      } else {
        // Xử lý lỗi khi lưu vào database
        const errorData = await response.json();
        console.error("Error saving certificate to database:", errorData);
        alert(
          "Certificate minted on chain, but failed to save to database: " +
            (errorData.error || "Unknown error")
        );
      }
    } catch (error: unknown) {
      console.error("Error creating certificate:", error);
      const apiError = error as { message?: string };
      if (apiError?.message?.includes("User rejection")) {
        alert(
          "Bạn đã từ chối ký transaction. Vui lòng thử lại và chấp nhận trong ví Sui."
        );
      } else {
        alert(
          "Failed to create certificate: " +
            (apiError?.message || "Unknown error")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Khởi tạo state cho form đăng ký institution
  const defaultInstitutionForm = {
    institution_name: "",
    email: "",
    website: "",
  };

  const [institutionForm, setInstitutionForm] = useState(
    defaultInstitutionForm
  );

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) {
      alert("Vui lòng kết nối ví Sui trước");
      return;
    }

    if (
      !institutionForm.institution_name ||
      !institutionForm.email ||
      !institutionForm.website
    ) {
      alert("Vui lòng điền đầy đủ thông tin tổ chức (tên, email, website)");
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra user trước
      console.log("[Frontend] Checking user...");
      const userResponse = await fetch(
        `/api/users?wallet_address=${currentAccount.address}`
      );
      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.user) {
        console.error("[Frontend] User check failed:", userData);
        throw new Error(
          userData.error ||
            "Failed to verify user. Please try reconnecting your wallet."
        );
      }
      console.log("[Frontend] User verified:", userData.user.wallet_address);

      // Tạo institution capability trên blockchain
      console.log("[Frontend] Creating institution capability...");
      const result = await createInstitutionCap(
        institutionForm.institution_name
      );
      if (!result || !result.digest) {
        throw new Error("Transaction failed. Please try again.");
      }
      console.log("[Frontend] Institution capability created:", result.digest);

      // Gửi request tạo/cập nhật institution
      console.log("[Frontend] Sending institution request...");
      const response = await fetch("/api/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: institutionForm.institution_name,
          email: institutionForm.email,
          website: institutionForm.website,
          wallet_address: currentAccount.address,
        }),
      });

      const data = await response.json();
      console.log("[Frontend] Institution API response:", data);

      if (!response.ok) {
        console.error("[Frontend] Institution API error:", data);
        throw new Error(
          data.error || "Failed to process institution registration"
        );
      }

      // Hiển thị thông báo phù hợp
      alert(data.message);

      setInstitutionForm(defaultInstitutionForm);
      await fetchInstitutions();
      await checkUserInstitution();
    } catch (error: unknown) {
      console.error("[Frontend] Error handling institution:", error);
      const apiError = error as { message?: string };
      alert(apiError?.message || "Failed to process institution registration");
    } finally {
      setLoading(false);
    }
  };

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Digital Certificate Management on Sui Blockchain
          </h2>
          <p className="text-gray-600">
            Create, manage, and verify digital certificates as NFTs on the Sui
            blockchain
          </p>
        </div>

        <Tabs defaultValue="create-certificate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create-certificate">
              Create Certificate
            </TabsTrigger>
            <TabsTrigger value="register-institution">
              Register Institution
            </TabsTrigger>
            <TabsTrigger value="view-certificates">
              View Certificates
            </TabsTrigger>
            <TabsTrigger value="institutions">Institutions</TabsTrigger>
          </TabsList>

          {/* Create Certificate Tab */}
          <TabsContent value="create-certificate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create New Certificate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!currentAccount ? (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Vui lòng kết nối ví Sui để tạo certificate
                    </p>
                    <div className="flex justify-center">
                      <Wallet className="h-8 w-8 text-gray-400 mb-2" />
                    </div>
                  </div>
                ) : !userInstitution ? (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Bạn cần đăng ký tổ chức trước khi tạo certificate
                    </p>
                    <div className="flex justify-center">
                      <Building className="h-8 w-8 text-gray-400 mb-2" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Vui lòng chuyển đến tab &quot;Register Institution&quot;
                      để đăng ký
                    </p>
                    <Button
                      onClick={checkUserInstitution}
                      variant="outline"
                      className="mt-4"
                    >
                      Kiểm tra lại tổ chức
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCertificateSubmit}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-blue-50 rounded-lg mb-4">
                      <p className="text-sm text-blue-700">
                        Đang tạo certificate cho tổ chức:{" "}
                        <strong>{userInstitution.institution_name}</strong>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recipient_name">Recipient Name</Label>
                        <Input
                          id="recipient_name"
                          value={certificateForm.recipient_name}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              recipient_name: e.target.value,
                            })
                          }
                          placeholder="Enter recipient's full name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="course_name">Course Name</Label>
                        <Input
                          id="course_name"
                          value={certificateForm.course_name}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              course_name: e.target.value,
                            })
                          }
                          placeholder="Enter course name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="institution">Institution Name</Label>
                        <Input
                          id="institution"
                          value={certificateForm.institution}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              institution: e.target.value,
                            })
                          }
                          placeholder="Enter institution name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="recipient_address">
                          Recipient Wallet Address
                        </Label>
                        <Input
                          id="recipient_address"
                          value={certificateForm.recipient_address}
                          onChange={(e) => {
                            const address = e.target.value;
                            if (validateRecipientAddress(address)) {
                              setCertificateForm({
                                ...certificateForm,
                                recipient_address: address,
                              });
                            } else {
                              // Hiển thị thông báo lỗi
                              alert(
                                "Không thể tạo certificate cho chính ví của bạn"
                              );
                            }
                          }}
                          onBlur={(e) => {
                            // Kiểm tra khi người dùng rời khỏi input
                            if (!validateRecipientAddress(e.target.value)) {
                              setCertificateForm({
                                ...certificateForm,
                                recipient_address: "", // Xóa địa chỉ không hợp lệ
                              });
                            }
                          }}
                          placeholder="Nhập địa chỉ ví người nhận (không được là ví của bạn)"
                          required
                        />
                        {certificateForm.recipient_address &&
                          !validateRecipientAddress(
                            certificateForm.recipient_address
                          ) && (
                            <p className="text-sm text-red-500 mt-1">
                              Không thể tạo certificate cho chính ví của bạn
                            </p>
                          )}
                      </div>

                      <div>
                        <Label htmlFor="issue_date">Issue Date</Label>
                        <Input
                          id="issue_date"
                          type="date"
                          value={certificateForm.issue_date}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              issue_date: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="completion_date">Completion Date</Label>
                        <Input
                          id="completion_date"
                          type="date"
                          value={certificateForm.completion_date}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              completion_date: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="name">Certificate Name</Label>
                        <Input
                          id="name"
                          value={certificateForm.name}
                          onChange={(e) =>
                            setCertificateForm({
                              ...certificateForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter certificate name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="image">
                          Certificate Image (for URL)
                        </Label>
                        <Input
                          id="image"
                          type="file" // Thay đổi type thành file
                          accept="image/*" // Chỉ chấp nhận các loại file ảnh
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCertificateImageFile(e.target.files[0]);
                            } else {
                              setCertificateImageFile(null);
                            }
                          }}
                        />
                        {/* Hiển thị tên file đã chọn (tùy chọn) */}
                        {certificateImageFile && (
                          <p className="text-sm text-gray-500 mt-1">
                            Selected file: {certificateImageFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={certificateForm.description}
                        onChange={(e) =>
                          setCertificateForm({
                            ...certificateForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter certificate description"
                        rows={3}
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading
                        ? "Creating Certificate..."
                        : "Create Certificate"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Institution Tab */}
          <TabsContent value="register-institution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Register Institution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!currentAccount ? (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Please connect your Sui wallet to register an institution
                    </p>
                    <div className="flex justify-center">
                      <Wallet className="h-8 w-8 text-gray-400 mb-2" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Use the &quot;Kết nối Ví Sui&quot; button in the top
                      navigation
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleInstitutionSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="institution_name">Institution Name</Label>
                      <Input
                        id="institution_name"
                        value={institutionForm.institution_name}
                        onChange={(e) =>
                          setInstitutionForm({
                            ...institutionForm,
                            institution_name: e.target.value,
                          })
                        }
                        placeholder="Enter institution name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="institution_email">Email</Label>
                      <Input
                        id="institution_email"
                        type="email"
                        value={institutionForm.email}
                        onChange={(e) =>
                          setInstitutionForm({
                            ...institutionForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="Enter institution email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="institution_website">Website</Label>
                      <Input
                        id="institution_website"
                        type="url"
                        value={institutionForm.website}
                        onChange={(e) =>
                          setInstitutionForm({
                            ...institutionForm,
                            website: e.target.value,
                          })
                        }
                        placeholder="https://example.com"
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Registering..." : "Register Institution"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* View Certificates Tab */}
          <TabsContent value="view-certificates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Certificates</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchCertificates} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Bộ lọc */}
                <div className="mb-6 space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Tìm kiếm theo tên khóa học, người nhận, tên NFT..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select
                      value={selectedInstitution}
                      onValueChange={setSelectedInstitution}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Chọn tổ chức" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả tổ chức</SelectItem>
                        {Array.from(
                          new Set(
                            Array.isArray(certificates)
                              ? certificates.map((c) => c.institution_name)
                              : []
                          )
                        ).map((inst) => (
                          <SelectItem key={inst} value={inst}>
                            {inst}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            start: e.target.value,
                          }))
                        }
                        className="w-[150px] border rounded-md px-3 py-2"
                      />
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            end: e.target.value,
                          }))
                        }
                        className="w-[150px] border rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Danh sách certificates */}
                <div className="space-y-4">
                  {paginatedCertificates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Không tìm thấy certificate nào
                      </p>
                    </div>
                  ) : (
                    <>
                      {paginatedCertificates.map((cert) => (
                        <CertificateCard
                          key={cert.id}
                          certificate={cert}
                          transactionMap={transactionMap}
                          onCopy={copyToClipboard}
                        />
                      ))}

                      {/* Phân trang */}
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-6">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() =>
                                    currentPage > 1 &&
                                    setCurrentPage((p) => p - 1)
                                  }
                                />
                              </PaginationItem>
                              {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1
                              ).map((page) => (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                              <PaginationItem>
                                <PaginationNext
                                  onClick={() =>
                                    currentPage < totalPages &&
                                    setCurrentPage((p) => p + 1)
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Institutions Tab */}
          <TabsContent value="institutions">
            <InstitutionList institutions={institutions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
