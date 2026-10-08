import React, { useState, useEffect } from "react";
import {
  Table,
  Select,
  Input,
  Button,
  Typography,
  Space,
  Modal,
  Tooltip,
  Checkbox,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuth } from "../AuthContext";
import "../components/PersonnelSelection.css";
import EndorsePreview from "../components/EndorsePreview";
import {
  defaultEndorsePlacements,
  type EndorsePlacements,
} from "../components/endorsePlacements";
import { API_BASE_URL, resolveFileUrl } from "../lib/api-config";

const apiBase = API_BASE_URL;
const getAbsoluteUrl = resolveFileUrl;

const { Option } = Select;
const { Text } = Typography;

const parseEndorsePages = (value: string) => [
  ...new Set(
    value
      .split(/[^0-9]+/)
      .map(Number)
      .filter((page) => page > 0),
  ),
];

interface Submission {
  id: number;
  fullName: string;
  nssNumber: string;
  gender: string;
  email: string;
  placeOfResidence: string;
  phoneNumber: string;
  universityAttended: string;
  regionOfSchool: string;
  yearOfNSS: string;
  divisionPostedTo: string;
  postingLetterUrl: string;
  appointmentLetterUrl: string;
  status: string;
  uploadRejected?: boolean;
  createdAt: string;
  updatedAt: string;
  programStudied: string;
  user: {
    phoneNumber: string;
  };
}

const PersonnelSelection: React.FC = () => {
  const { role } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>(
    [],
  );
  const [programFilter, setProgramFilter] = useState<string>("All courses");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{
    url: string;
    type: string;
    id?: number;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [endorseIds, setEndorseIds] = useState<number[]>([]);
  const [endorsePages, setEndorsePages] = useState("4, 5");
  const [placements, setPlacements] = useState<EndorsePlacements>(
    defaultEndorsePlacements,
  );
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
  const [rejectUploadVisible, setRejectUploadVisible] = useState(false);
  const [rejectUploadReason, setRejectUploadReason] = useState("");
  const [rejectUploadIds, setRejectUploadIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/users/submissions`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data: Submission[] = await response.json();
        if (response.ok) {
          const pendingSubmissions = data.filter(
            (s) =>
              (s.status === "PENDING" || s.status === "PENDING_ENDORSEMENT") &&
              !s.uploadRejected,
          );
          setSubmissions(pendingSubmissions);
          setFilteredSubmissions(pendingSubmissions);
          const uniquePrograms = Array.from(
            new Set(data.map((s: Submission) => s.programStudied)),
          );
          setPrograms(["All courses", ...uniquePrograms]);
        } else {
          toast.error((data as any).message || "Failed to load submissions");
        }
      } catch (error) {
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let filtered = submissions;
    if (programFilter !== "All courses") {
      filtered = filtered.filter((s) => s.programStudied === programFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(lowerSearch) ||
          s.nssNumber.toLowerCase().includes(lowerSearch) ||
          s.email.toLowerCase().includes(lowerSearch) ||
          s.universityAttended.toLowerCase().includes(lowerSearch),
      );
    }
    setFilteredSubmissions(filtered);
    setSelectedRows([]);
  }, [programFilter, searchTerm, submissions]);

  const handleSelectAll = () => {
    if (selectedRows.length === filteredSubmissions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredSubmissions.map((s) => s.id));
    }
  };

  const handleRowSelect = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const exportToExcel = () => {
    const exportData = (
      selectedRows.length > 0
        ? filteredSubmissions.filter((s) => selectedRows.includes(s.id))
        : filteredSubmissions
    ).map((s) => ({
      ID: s.id,
      "Full Name": s.fullName,
      "NSS Number": s.nssNumber,
      Email: s.email,
      Gender: s.gender,
      "Place of Residence": s.placeOfResidence,
      "Phone Number": s.phoneNumber,
      "University Attended": s.universityAttended,
      "Region of School": s.regionOfSchool,
      "Year of NSS": s.yearOfNSS,
      "Program Studied": s.programStudied,
      "Division Posted To": s.divisionPostedTo,
      "Posting & Appointment Letter URL":
        s.appointmentLetterUrl || s.postingLetterUrl,
      Status: s.status,
      "Created At": s.createdAt,
      "Updated At": s.updatedAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "personnel_submissions.xlsx");
  };

  // Handle letter view
  const showLetter = (
    url: string,
    type: string,
    id?: number,
    idsToEndorse: number[] = [],
  ) => {
    setEndorseIds(idsToEndorse);
    setPlacements(defaultEndorsePlacements);
    setModalContent({ url, type, id });
    setModalVisible(true);
  };

  const openEndorse = (record: Submission, ids: number[] = [record.id]) => {
    const letterUrl = record.appointmentLetterUrl || record.postingLetterUrl;
    if (!letterUrl) {
      toast.error("This personnel has no posting and appointment letter");
      return;
    }
    if (record.uploadRejected) {
      toast.error("This letter was rejected and is waiting for a new PDF");
      return;
    }
    showLetter(letterUrl, "Posting & Appointment Letter", record.id, ids);
  };

  const handleEndorse = async () => {
    const ids = endorseIds.length
      ? endorseIds
      : modalContent?.id
        ? [modalContent.id]
        : [];
    if (ids.length === 0) return;
    const pages = parseEndorsePages(endorsePages);
    if (pages.length === 0) {
      toast.error("Enter the page numbers to endorse, for example 4, 5");
      return;
    }
    setLoading(true);
    try {
      for (const id of ids) {
        const response = await fetch("/documents/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            submissionId: id,
            documentType: "appointmentLetter",
            pages,
            placements,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to endorse");
        }
      }
      setSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
      setFilteredSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
      setSelectedRows([]);
      setModalVisible(false);
      toast.success(
        ids.length === 1
          ? "Endorsed. The personnel can now upload a verification form."
          : `${ids.length} personnel endorsed`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to endorse");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (modalContent?.url) {
      const fileUrl = getAbsoluteUrl(modalContent.url);
      window.open(fileUrl, "_blank");
    }
  };

  const handleRejectConfirm = async () => {
    setLoading(true);
    try {
      const updatePromises = selectedRows.map(async (id) => {
        const response = await fetch(`/users/update-submission-status/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            status: "REJECTED",
            comment: "Rejected from personnel selection",
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to reject personnel");
        }
        return id;
      });

      await Promise.all(updatePromises);

      setSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setFilteredSubmissions((prev) =>
        prev.filter((s) => !selectedRows.includes(s.id)),
      );
      setSelectedRows([]);
      setRejectModalVisible(false);
      toast.success(`${selectedRows.length} personnel rejected successfully`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject personnel");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUpload = async () => {
    if (rejectUploadReason.trim().length < 5) {
      toast.error("Enter a reason of at least 5 characters");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        rejectUploadIds.map(async (id) => {
          const response = await fetch(`${apiBase}/users/reject-upload/${id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              target: "letter",
              reason: rejectUploadReason.trim(),
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to reject upload");
          }
        }),
      );
      toast.success("Upload rejected. The personnel has been emailed.");
      setRejectUploadVisible(false);
      setRejectUploadReason("");
      setModalVisible(false);
      setSelectedRows([]);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject upload");
    } finally {
      setLoading(false);
    }
  };

  if (role !== "ADMIN" && role !== "SUPERADMIN" && role !== "STAFF") {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  const truncateText = (text: string, maxLength: number = 15) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const columns = [
    {
      title: (
        <Checkbox
          checked={
            selectedRows.length === filteredSubmissions.length &&
            filteredSubmissions.length > 0
          }
          indeterminate={
            selectedRows.length > 0 &&
            selectedRows.length < filteredSubmissions.length
          }
          onChange={handleSelectAll}
        />
      ),
      key: "selection",
      width: 10,
      render: (_: any, record: Submission) => (
        <Checkbox
          checked={selectedRows.includes(record.id)}
          onChange={() => handleRowSelect(record.id)}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "fullName",
      key: "fullName",
      width: 120,
      ellipsis: true,
    },
    {
      title: "NSS No.",
      dataIndex: "nssNumber",
      key: "nssNumber",
      width: 100,
      ellipsis: true,
    },
    // {
    //   title: 'Email',
    //   dataIndex: 'email',
    //   key: 'email',
    //   width: 100,
    //   render: (text: string) => (
    //     <Tooltip title={text}>
    //       <span>{truncateText(text)}</span>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 80,
    },
    {
      title: "Phone",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      width: 110,
      ellipsis: true,
    },
    // {
    //   title: 'Region',
    //   dataIndex: 'regionOfSchool',
    //   key: 'regionOfSchool',
    //   width: 100,
    //   render: (text: string) => (
    //     <Tooltip title={text}>
    //       <span>{truncateText(text)}</span>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Division",
      dataIndex: "divisionPostedTo",
      key: "divisionPostedTo",
      width: 130,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{truncateText(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 80,
      ellipsis: true,
      render: (status: string) => (
        <span className={`status-${status.toLowerCase()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      title: "Posting & Appt. Letter",
      key: "appointmentLetterUrl",
      width: 160,
      ellipsis: true,
      render: (_: any, record: Submission) => {
        const letterUrl =
          record.appointmentLetterUrl || record.postingLetterUrl;
        return letterUrl ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                showLetter(
                  letterUrl,
                  "Posting & Appointment Letter",
                  record.id,
                );
              }}
              icon={
                <EyeOutlined style={{ fontSize: "16px", color: "#5B3418" }} />
              }
            />
            {record.uploadRejected && (
              <span className="text-xs text-[#c95757]">Rejected</span>
            )}
          </div>
        ) : (
          ""
        );
      },
    },
  ];

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mx-auto w-full max-w-full">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#2c241f]">
          Shortlist Personnel
        </h2>
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[#e6dfd6] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <Space>
            <Text className="text-base font-semibold text-[#5B3418] bg-amber-100 px-3 py-1 rounded-md">
              Waiting: {submissions.length}
            </Text>
            {selectedRows.length > 0 && (
              <Space>
                <Text>{`${selectedRows.length} selected`}</Text>
                {isAdmin && (
                  <>
                    <Button
                      type="primary"
                      className="naspac-btn-primary"
                      onClick={() => {
                        const chosen = filteredSubmissions.filter((s) =>
                          selectedRows.includes(s.id),
                        );
                        const first = chosen.find(
                          (s) => s.appointmentLetterUrl || s.postingLetterUrl,
                        );
                        if (!first) {
                          toast.error("Select a personnel who has a letter");
                          return;
                        }
                        openEndorse(first, selectedRows);
                      }}
                    >
                      Endorse
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => setRejectModalVisible(true)}
                      className="naspac-btn-danger"
                      icon={<FileExcelOutlined />}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  type="primary"
                  onClick={() => {
                    setRejectUploadIds(selectedRows);
                    setRejectUploadReason("");
                    setRejectUploadVisible(true);
                  }}
                  className="naspac-btn-danger"
                >
                  Reject upload
                </Button>
              </Space>
            )}
            <Select
              value={programFilter}
              onChange={setProgramFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by program"
            >
              {programs.map((program) => (
                <Option key={program} value={program}>
                  {program}
                </Option>
              ))}
            </Select>
          </Space>
          <Space className="w-full sm:w-auto">
            <Input
              placeholder="Search by name, NSS, email, or university"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              className="rounded-md border-[#a9a7a7] w-full sm:w-auto"
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
              className="export-button !border-amber-50 w-full sm:w-auto"
            >
              Export
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey="id"
          loading={loading}
          className="rounded-md"
          scroll={{ x: "max-content" }}
          size="large"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: (event) => {
              if (
                !(event.target as HTMLElement).closest(
                  ".ant-btn, .ant-checkbox",
                )
              ) {
                if (isAdmin) {
                  openEndorse(record, [record.id]);
                } else {
                  handleRowSelect(record.id);
                }
              }
            },
          })}
        />
        <Modal
          title={modalContent?.type}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button
              key="download"
              className="naspac-btn-primary"
              type="default"
              onClick={handleDownload}
            >
              Download
            </Button>,
            isAdmin && modalContent?.type === "Posting & Appointment Letter" && (
              <Button
                key="endorse"
                className="naspac-btn-primary"
                type="primary"
                onClick={handleEndorse}
                loading={loading}
              >
                {endorseIds.length > 1 ? `Endorse ${endorseIds.length}` : "Endorse"}
              </Button>
            ),
            modalContent?.id && (
              <Button
                key="reject-upload"
                className="naspac-btn-danger"
                type="primary"
                onClick={() => {
                  setRejectUploadIds(
                    endorseIds.length ? endorseIds : [modalContent.id as number],
                  );
                  setRejectUploadReason("");
                  setRejectUploadVisible(true);
                }}
              >
                Reject upload
              </Button>
            ),
            <Button
              key="close"
              className="naspac-btn-secondary"
              onClick={() => setModalVisible(false)}
            >
              Close
            </Button>,
          ].filter(Boolean)}
          width={isAdmin ? 980 : 800}
          className="centered-modal"
        >
          {isAdmin && modalContent?.type === "Posting & Appointment Letter" && (
            <div className="mb-3">
              <Text className="mb-1 block">Pages to endorse</Text>
              <Input
                value={endorsePages}
                onChange={(e) => setEndorsePages(e.target.value)}
                placeholder="4, 5"
              />
              <p className="mt-1 text-xs text-[#625E5C]">
                Place the date, signature, and stamp, then click Endorse. The
                personnel moves to Manage Personnel and is asked to upload a
                verification form.
              </p>
            </div>
          )}
          {modalContent?.url &&
          isAdmin &&
          modalContent.type === "Posting & Appointment Letter" ? (
            <EndorsePreview
              fileUrl={getAbsoluteUrl(modalContent.url)}
              pages={
                parseEndorsePages(endorsePages).length
                  ? parseEndorsePages(endorsePages)
                  : [4, 5]
              }
              placements={placements}
              onChange={setPlacements}
            />
          ) : modalContent?.url ? (
            <iframe
              src={getAbsoluteUrl(modalContent.url)}
              style={{ width: "100%", height: "80vh", border: "none" }}
              title={modalContent.type}
            />
          ) : null}
        </Modal>
        <Modal
          title="Confirm Rejection"
          open={rejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={() => setRejectModalVisible(false)}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{ className: "naspac-btn-primary" }}
          cancelButtonProps={{ className: "naspac-btn-secondary" }}
        >
          <p>
            Are you sure you want to reject {selectedRows.length} personnel?
            This action will notify them to do reposting.
          </p>
        </Modal>
        <Modal
          title="Reject this upload"
          open={rejectUploadVisible}
          onOk={handleRejectUpload}
          onCancel={() => setRejectUploadVisible(false)}
          okText="Reject and email"
          cancelText="Cancel"
          confirmLoading={loading}
          okButtonProps={{ className: "naspac-btn-danger" }}
          cancelButtonProps={{ className: "naspac-btn-secondary" }}
        >
          <p className="mb-2">
            Use this when the PDF is the wrong document. The personnel keeps
            their account, receives an email, and can upload a new PDF.
          </p>
          <Input.TextArea
            rows={4}
            value={rejectUploadReason}
            onChange={(e) => setRejectUploadReason(e.target.value)}
            placeholder="Say what is wrong with the document"
          />
        </Modal>
      </div>
    </div>
  );
};

export default PersonnelSelection;
