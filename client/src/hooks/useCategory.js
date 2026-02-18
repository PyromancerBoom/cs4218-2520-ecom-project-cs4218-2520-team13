import { useState, useEffect } from "react";
import axios from "axios";

export default function useCategory() {
  const [categories, setCategories] = useState([]);

  //get cat
  const getCategories = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      setCategories(data?.category || []); //bugfix: if data.category is undefined, set to empty array
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  return categories;
}