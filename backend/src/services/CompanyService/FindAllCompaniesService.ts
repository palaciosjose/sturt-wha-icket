import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Setting from "../../models/Setting";

const FindAllCompanyService = async (): Promise<Company[]> => {
  try {
    const companies = await Company.findAll({
      order: [["name", "ASC"]],
      include: [
        { model: Plan, as: "plan", attributes: ["id", "name", "value"] },
        { model: Setting, as: "settings" }
      ]
    });
    
    return companies;
  } catch (error) {
    console.error("❌ [FindAllCompaniesService] Error:", error);
    throw error;
  }
};

export default FindAllCompanyService;
