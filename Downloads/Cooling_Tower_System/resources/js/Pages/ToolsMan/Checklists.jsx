import Checklists from "../Shared/Checklists";
import { TOOLS_MAN_ENDPOINTS } from "../../utils/superAdmin";

export default function ToolsManChecklists(props) {
    return (
        <Checklists
            {...props}
            endpoints={props.endpoints || TOOLS_MAN_ENDPOINTS}
        />
    );
}
