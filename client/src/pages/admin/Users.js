import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/AdminMenu';
import toast from "react-hot-toast";

const Users = () => {
  const [users, setUsers] = useState([]);

  // Fetch all users from API
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/v1/auth/all-users");
      if (data?.success) {
        setUsers(data?.users);
      } else {
        toast.error(data?.message || "Failed to fetch users");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting users");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>All Users List</h1>
            <table className="table mt-3">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Address</th>
                  <th scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {users?.length > 0 ? (
                  users.map((u, i) => {
                    const isAdmin = u.role === 1;
                    return (
                      <tr key={u._id} className="align-middle">
                        <td>{i + 1}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone}</td>
                        <td>{u.address || "N/A"}</td>
                        <td>
                          <div style={{
                            display: "inline-block",
                            padding: "2px 12px",
                            borderRadius: "50px",
                            fontSize: "11px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            backgroundColor: isAdmin ? "#fff5f5" : "#f8f9fa",
                            color: isAdmin ? "#e03131" : "#6c757d",
                            border: `1px solid ${isAdmin ? "#ffc9c9" : "#e9ecef"}`,
                          }}>
                            {isAdmin ? "Admin" : "User"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center p-5 text-muted">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;