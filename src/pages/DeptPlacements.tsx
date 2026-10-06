import React, { useState, useEffect } from "react";
import {
  Table,
  Select,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  Space,
  Checkbox,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuth } from "../AuthContext";
import "../components/PersonnelSelection.css";

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

interface Department {
  id: number;
  name: string;
  supervisorId: number;
  supervisorName: string;
  supervisor: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface Personnel {
  id: number;
  name: string;
  nssNumber: string;
  department: Department | null;
  submissions: {
    id: number;
    fullName: string;
    nssNumber: string;
    programStudied: string;
    divisionPostedTo: string;
    status: string;
  }[];
}

interface Supervisor {
  id: number;
  name: string;
  role: "ADMIN" | "STAFF" | "SUPERVISOR";
}

const DepartmentPlacements: React.FC = () => {
  const { role } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [changeDeptModalVisible, setChangeDeptModalVisible] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"create" | "edit">("create");
  const [selectedEditDepartment, setSelectedEditDepartment] = useState<
    number | null
  >(null);
  const [form] = Form.useForm();

  // Fetch departments, personnel, and supervisors
  useEffect(() => {
    const fetchDepartmentsAndPersonnel = async () => {
      setLoading(true);
      try {
        const deptResponse = await fetch("/users/departments", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const deptData: Department[] = await deptResponse.json();
        if (!deptResponse.ok) {
          throw new Error(
            (deptData as any).message || "Failed to load departments",
          );
        }

        const personnelResponse = await fetch("/users/personnel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            statuses: [
              "PENDING_ENDORSEMENT",
              "ENDORSED",
              "VALIDATED",
              "COMPLETED",
            ],
          }),
        });
        const personnelData: Personnel[] = await personnelResponse.json();
        if (!personnelResponse.ok) {
          throw new Error(
            (personnelData as any).message || "Failed to load personnel",
          );
        }

        setDepartments(deptData);
        setPersonnel(personnelData);
        setFilteredPersonnel(personnelData);
      } catch (error: any) {
        toast.error(error.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    const fetchSupervisors = async () => {
      try {
        const response = await fetch("/users/staff", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data: Supervisor[] = await response.json();
        if (response.ok) {
          setSupervisors(data.filter((s) => s.role === "SUPERVISOR"));
        } else {
          toast.error((data as any).message || "Failed to load supervisors");
        }
      } catch (error) {
        toast.error("Failed to load supervisors");
      }
    };

    if (role && ["ADMIN", "STAFF"].includes(role)) {
      fetchDepartmentsAndPersonnel();
    }
    if (role === "ADMIN") {
      fetchSupervisors();
    }
  }, [role]);

  useEffect(() => {
    let filtered = personnel;
    if (departmentFilter !== "All") {
      filtered = filtered.filter(
        (p) => p.department?.name === departmentFilter,
      );
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.nssNumber.toLowerCase().includes(lowerSearch) ||
          (p.department?.name || "").toLowerCase().includes(lowerSearch),
      );
    }
    setFilteredPersonnel(filtered);
    setSelectedRows([]);
  }, [departmentFilter, searchTerm, personnel]);

  const handleSelectAll = () => {
    if (selectedRows.length === filteredPersonnel.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredPersonnel.map((p) => p.id));
    }
  };

  const handleRowSelect = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = (
      selectedRows.length > 0
        ? filteredPersonnel.filter((p) => selectedRows.includes(p.id))
        : filteredPersonnel
    ).map((p) => ({
      ID: p.id,
      Name: p.name,
      "NSS Number": p.nssNumber,
      Department: p.department?.name || "Unassigned",
      "Program Studied": p.submissions[0]?.programStudied || "N/A",
      Supervisor: p.department?.supervisor?.name || "Unassigned",
      Status: p.submissions[0]?.status || "N/A",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Personnel");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "department_placements.xlsx");
  };

  // Handle create department
  const handleCreateDepartment = async (values: {
    name: string;
    supervisorId: number;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/users/create-department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: values.name,
          supervisorId: Number(values.supervisorId),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments((prev) => [
          ...prev,
          {
            ...data,
            supervisorName:
              supervisors.find((s) => s.id === data.supervisorId)?.name ||
              "Unknown",
            supervisor: {
              id: data.supervisorId,
              name:
                supervisors.find((s) => s.id === data.supervisorId)?.name ||
                "Unknown",
              email: "",
            },
          },
        ]);
        setCreateModalVisible(false);
        form.resetFields();
        toast.success("Department created successfully");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to create department");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit department
  const handleEditDepartment = async (values: {
    name: string;
    supervisorId: number;
  }) => {
    if (!selectedEditDepartment) {
      toast.error("No department selected for editing");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/users/department/${selectedEditDepartment}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: values.name,
            supervisorId: Number(values.supervisorId),
          }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setDepartments((prev) =>
          prev.map((dept) =>
            dept.id === selectedEditDepartment
              ? {
                  ...dept,
                  name: data.name,
                  supervisorId: data.supervisorId,
                  supervisorName:
                    supervisors.find((s) => s.id === data.supervisorId)?.name ||
                    "Unknown",
                  supervisor: {
                    id: data.supervisorId,
                    name:
                      supervisors.find((s) => s.id === data.supervisorId)
                        ?.name || "Unknown",
                    email: "",
                  },
                }
              : dept,
          ),
        );
        setCreateModalVisible(false);
        setSelectedEditDepartment(null);
        form.resetFields();
        toast.success("Department updated successfully");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to update department");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete department
  const handleDeleteDepartment = async () => {
    if (!selectedEditDepartment) {
      toast.error("No department selected for deletion");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/users/department/${selectedEditDepartment}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      const data = await response.json();
      if (response.ok) {
        setDepartments((prev) =>
          prev.filter((dept) => dept.id !== selectedEditDepartment),
        );
        setCreateModalVisible(false);
        setSelectedEditDepartment(null);
        form.resetFields();
        toast.success(data.message || "Department deleted successfully");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to delete department");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  // Handle change department
  const handleChangeDepartment = async () => {
    if (!selectedDepartment) {
      toast.error("Please select a department");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/users/change-department", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          departmentId: selectedDepartment,
          userIds: selectedRows,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setPersonnel((prev) =>
          prev.map((p) =>
            selectedRows.includes(p.id)
              ? {
                  ...p,
                  department:
                    departments.find((d) => d.id === selectedDepartment) ||
                    null,
                }
              : p,
          ),
        );
        setFilteredPersonnel((prev) =>
          prev.map((p) =>
            selectedRows.includes(p.id)
              ? {
                  ...p,
                  department:
                    departments.find((d) => d.id === selectedDepartment) ||
                    null,
                }
              : p,
          ),
        );
        setSelectedRows([]);
        setChangeDeptModalVisible(false);
        setSelectedDepartment(null);
        toast.success(data.message || "Department changed successfully");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to change department");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to change department");
    } finally {
      setLoading(false);
    }
  };

  // Restrict to ADMIN or STAFF
  if (!role || !["ADMIN", "STAFF"].includes(role)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  // Table columns
  const columns = [
    {
      title: (
        <Checkbox
          checked={
            selectedRows.length === filteredPersonnel.length &&
            filteredPersonnel.length > 0
          }
          indeterminate={
            selectedRows.length > 0 &&
            selectedRows.length < filteredPersonnel.length
          }
          onChange={handleSelectAll}
        />
      ),
      key: "selection",
      width: 50,
      render: (_: any, record: Personnel) => (
        <Checkbox
          checked={selectedRows.includes(record.id)}
          onChange={() => handleRowSelect(record.id)}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
    },
    {
      title: "NSS No.",
      dataIndex: "nssNumber",
      key: "nssNumber",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Department",
      dataIndex: ["department", "name"],
      key: "department",
      width: 200,
      ellipsis: true,
      render: (name: string | undefined) => name || "Unassigned",
    },
    {
      title: "Program Studied",
      key: "programStudied",
      width: 180,
      ellipsis: true,
      render: (record: Personnel) =>
        record.submissions[0]?.programStudied || "N/A",
    },
    {
      title: "Supervisor",
      dataIndex: ["department", "supervisor", "name"],
      key: "supervisor",
      width: 200,
      ellipsis: true,
      render: (name: string | undefined) => name || "Unassigned",
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      ellipsis: true,
      render: (record: Personnel) => (
        <span
          className={`status-${record.submissions[0]?.status.toLowerCase()}`}
        >
          {record.submissions[0]?.status.charAt(0).toUpperCase() +
            record.submissions[0]?.status.slice(1).toLowerCase()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen px-2 py-4">
      <div className="w-full max-w-full mx-auto">
        <h2 className="text-xl font-bold text-[#3C3939] mb-4 text-center">
          Department Placements
        </h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Space>
            {role === "ADMIN" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
                className="!bg-[#5B3418] hover:!bg-[#4a2c1c] !border-0"
              >
                Create Dept.
              </Button>
            )}
            {selectedRows.length > 0 && (
              <Space>
                <Text>{`${selectedRows.length} selected`}</Text>
                <Button
                  type="primary"
                  onClick={() => setChangeDeptModalVisible(true)}
                  className="!bg-[#6e6d6c] hover:!bg-[#504d4d] !border-0"
                >
                  Change Dept.
                </Button>
              </Space>
            )}
            <Select
              value={departmentFilter}
              onChange={setDepartmentFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by department"
            >
              <Option value="All">All</Option>
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.name}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Space>
          <Space className="w-full sm:w-auto">
            <Input
              placeholder="Search by name, NSS, or department"
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
          dataSource={filteredPersonnel}
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
                handleRowSelect(record.id);
              }
            },
          })}
        />
        <Modal
          title="Manage Department"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            setSelectedEditDepartment(null);
            setActiveTab("create");
            form.resetFields();
          }}
          footer={null}
          className="centered-modal"
        >
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "create" | "edit")}
          >
            <TabPane tab="Create" key="create">
              <Form
                form={form}
                onFinish={handleCreateDepartment}
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  name="name"
                  label="Department Name"
                  rules={[
                    { required: true, message: "Please enter department name" },
                  ]}
                >
                  <Input placeholder="Enter department name" />
                </Form.Item>
                <Form.Item
                  name="supervisorId"
                  label="Supervisor"
                  rules={[
                    { required: true, message: "Please select a supervisor" },
                  ]}
                >
                  <Select placeholder="Select supervisor">
                    {supervisors.map((supervisor) => (
                      <Option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      className="!bg-[#5B3418] hover:!bg-[#4a2c1c] !border-0"
                    >
                      Create
                    </Button>
                    <Button
                      className="!bg-[#6e6d6c] hover:!bg-[#504d4d] !border-0"
                      onClick={() => {
                        setCreateModalVisible(false);
                        setActiveTab("create");
                        form.resetFields();
                      }}
                    >
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </TabPane>
            <TabPane tab="Edit" key="edit">
              <Form
                form={form}
                onFinish={handleEditDepartment}
                layout="vertical"
                className="mt-4"
              >
                <Form.Item
                  name="departmentId"
                  label="Select Department"
                  rules={[
                    { required: true, message: "Please select a department" },
                  ]}
                >
                  <Select
                    placeholder="Select department to edit"
                    onChange={(value) => {
                      setSelectedEditDepartment(value);
                      const dept = departments.find((d) => d.id === value);
                      if (dept) {
                        form.setFieldsValue({
                          name: dept.name,
                          supervisorId: dept.supervisorId,
                        });
                      }
                    }}
                  >
                    {departments.map((dept) => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="name"
                  label="Department Name"
                  rules={[
                    { required: true, message: "Please enter department name" },
                  ]}
                >
                  <Input placeholder="Enter department name" />
                </Form.Item>
                <Form.Item
                  name="supervisorId"
                  label="Supervisor"
                  rules={[
                    { required: true, message: "Please select a supervisor" },
                  ]}
                >
                  <Select placeholder="Select supervisor">
                    {supervisors.map((supervisor) => (
                      <Option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      className="!bg-[#5B3418] hover:!bg-[#4a2c1c] !border-0"
                    >
                      Update
                    </Button>
                    <Space>
                      <Button
                        className="!bg-[#6e6d6c] hover:!bg-[#504d4d] !border-0"
                        onClick={() => {
                          setCreateModalVisible(false);
                          setSelectedEditDepartment(null);
                          setActiveTab("create");
                          form.resetFields();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        icon={<DeleteOutlined />}
                        className="!bg-[#c95757] !border-0"
                        onClick={handleDeleteDepartment}
                        disabled={!selectedEditDepartment}
                      >
                        Delete
                      </Button>
                    </Space>
                  </Space>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </Modal>
        <Modal
          title="Change Department"
          open={changeDeptModalVisible}
          onOk={handleChangeDepartment}
          onCancel={() => {
            setChangeDeptModalVisible(false);
            setSelectedDepartment(null);
          }}
          okText="Confirm"
          cancelText="Cancel"
          okButtonProps={{
            className: "!bg-[#5B3418] !text-white !border-0",
            disabled: !selectedDepartment,
          }}
          cancelButtonProps={{ className: "!bg-[#c95757] !border-0" }}
        >
          <div className="flex flex-col gap-4">
            <p>
              Are you sure you want to change the department for{" "}
              {selectedRows.length} personnel?
            </p>
            <div className="flex justify-between items-center">
              <div className="w-1/3">
                <Select
                  showSearch
                  placeholder="Select a department"
                  value={selectedDepartment}
                  onChange={(value) => setSelectedDepartment(value)}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  className="w-full"
                >
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DepartmentPlacements;
