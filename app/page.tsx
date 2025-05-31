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
  created_at: string;
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
  txHash: string;
  description?: string;
  status: boolean;
  transaction_type: string;
  wallet_address: string;
}

// Export interface để có thể dùng ở component khác
export type { Institution };

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

  // Define all functions first
  const fetchCertificates = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const response = await fetch("/api/certificates");
      const data = await response.json();
      setCertificates(data.certificates || []);

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
    }
  }, [currentAccount]);

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
        setUserInstitution(data.institution);
      } else {
        console.log("[Frontend] No institution found");
        setUserInstitution(null);
      }
    } catch (error) {
      console.error("[Frontend] Error checking institution:", error);
      setUserInstitution(null);
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

  // Then define useEffect hooks
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
  }, [currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      console.log("[Frontend] Wallet connected, checking institution...");
      checkUserInstitution();
    } else {
      console.log("[Frontend] No wallet connected, clearing institution");
      setUserInstitution(null);
    }
  }, [currentAccount, checkUserInstitution]);

  // Khởi tạo state cho form tạo certificate
  const defaultCertificateForm = {
    recipient_name: "",
    course_name: "",
    institution: "",
    issue_date: "",
    completion_date: "",
    description: "",
    recipient_address: "",
  };

  const [certificateForm, setCertificateForm] = useState(
    defaultCertificateForm
  );

  // Thêm hàm kiểm tra ví người nhận
  const validateRecipientAddress = (address: string) => {
    if (!currentAccount) return false;
    return address.toLowerCase() !== currentAccount.address.toLowerCase();
  };

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

      // Log trước khi tạo transaction
      console.log("Form data:", certificateForm);
      const moveCall = {
        target: `${PACKAGE_ID}::${MODULE_NAME}::mint_certificate` as const,
        arguments: [
          tx.pure(certificateForm.recipient_name || ""),
          tx.pure(certificateForm.course_name || ""),
          tx.pure(certificateForm.institution || ""),
          tx.pure(certificateForm.issue_date || ""),
          tx.pure(certificateForm.completion_date || ""),
          tx.pure(certificateForm.description || "Digital Certificate"),
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

      // Lấy object ID từ transaction effects
      let objectId = `0x${Math.random().toString(16).substr(2, 40)}`;
      if (result.effects?.created && result.effects.created.length > 0) {
        objectId = result.effects.created[0].reference.objectId;
      }

      // Lưu certificate vào cơ sở dữ liệu qua API
      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object_id: objectId,
          recipient_name: certificateForm.recipient_name,
          course_name: certificateForm.course_name,
          institution_name: certificateForm.institution,
          recipient_wallet_address: certificateForm.recipient_address,
          issue_date: certificateForm.issue_date,
          completion_date: certificateForm.completion_date,
          description: certificateForm.description,
          issuer_address: currentAccount.address,
          transaction_hash: result?.digest || "",
        }),
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
          - Mã giao dịch: ${result?.digest || "N/A"}
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
            description: `Mint certificate for ${certificateForm.recipient_name} - ${certificateForm.course_name}`,
          }),
        });
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

      // Lưu transaction vào database
      console.log("[Frontend] Saving transaction...");
      const txResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: currentAccount.address,
          transaction_type: "create_institution",
          txHash: result.digest,
          status: true,
          description: `Create/Update institution: ${institutionForm.institution_name}`,
        }),
      });

      if (!txResponse.ok) {
        const txData = await txResponse.json();
        console.warn("[Frontend] Failed to save transaction:", txData);
      }

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

  // Lấy user theo wallet_address từ API
  const fetchUser = async (wallet_address: string) => {
    try {
      const response = await fetch(
        `/api/users?wallet_address=${wallet_address}`
      );
      const data = await response.json();
      if (!response.ok) {
        console.error("Error fetching user:", data.error);
        return null;
      }
      return data.user; // API đã trả về user hoặc null
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };

  // Tạo user mới với wallet_address và thông tin bổ sung
  const createUser = async (wallet_address: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address,
          institution_name: null,
          email: null,
          website: null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Error creating user:", data.error);
        return null;
      }
      return data.user; // API trả về user mới hoặc user đã tồn tại
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  };

  // Thêm hàm lọc certificates
  const filterCertificates = useCallback(() => {
    let filtered = [...certificates];

    if (searchTerm) {
      filtered = filtered.filter(
        (cert) =>
          cert.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cert.recipient_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          cert.institution_name.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Cập nhật khi các điều kiện lọc thay đổi
  useEffect(() => {
    filterCertificates();
  }, [filterCertificates]);

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fix transaction fetching
  const fetchTransaction = async () => {
    try {
      const response = await fetch("/api/transactions?type=mint_certificate");
      const data = await response.json();
      if (data.success && data.transactions) {
        const txMap = data.transactions.reduce(
          (acc: Record<string, Transaction>, tx: Transaction) => {
            if (tx.description?.includes("Mint certificate for")) {
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
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
                          placeholder="Tìm kiếm theo tên khóa học, người nhận..."
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
                          new Set(certificates.map((c) => c.institution_name))
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
                        className="w-[150px]"
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
                        className="w-[150px]"
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
