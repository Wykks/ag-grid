import {Bean} from "../../context/context";
import {RowNode} from "../../entities/rowNode";
import {Utils as _} from '../../utils';
import {GridOptionsWrapper} from "../../gridOptionsWrapper";
import {Autowired} from "../../context/context";
import {SelectionController} from "../../selectionController";
import {EventService} from "../../eventService";
import {IRowNodeStage} from "../../interfaces/iRowNodeStage";

@Bean('flattenStage')
export class FlattenStage implements IRowNodeStage {

    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('selectionController') private selectionController: SelectionController;
    @Autowired('eventService') private eventService: EventService;

    public execute(rowsToFlatten: RowNode[]): RowNode[] {
        // even if not doing grouping, we do the mapping, as the client might
        // of passed in data that already has a grouping in it somewhere
        var result: RowNode[] = [];

        // putting value into a wrapper so it's passed by reference
        var nextRowTop: NumberWrapper = {value: 0};
        this.recursivelyAddToRowsToDisplay(rowsToFlatten, result, nextRowTop);

        return result;
    }

    private recursivelyAddToRowsToDisplay(rowsToFlatten: RowNode[], result: RowNode[], nextRowTop: NumberWrapper) {
        if (_.missingOrEmpty(rowsToFlatten)) { return; }

        var groupSuppressRow = this.gridOptionsWrapper.isGroupSuppressRow();
        for (var i = 0; i < rowsToFlatten.length; i++) {
            var rowNode = rowsToFlatten[i];
            var skipGroupNode = groupSuppressRow && rowNode.group;
            if (!skipGroupNode) {
                this.addRowNodeToRowsToDisplay(rowNode, result, nextRowTop);
            }
            if (rowNode.group && rowNode.expanded) {
                this.recursivelyAddToRowsToDisplay(rowNode.childrenAfterSort, result, nextRowTop);

                // put a footer in if user is looking for it
                if (this.gridOptionsWrapper.isGroupIncludeFooter()) {
                    var footerNode = this.createFooterNode(rowNode);
                    this.addRowNodeToRowsToDisplay(footerNode, result, nextRowTop);
                }
            }
        }
    }

    // duplicated method, it's also in floatingRowModel
    private addRowNodeToRowsToDisplay(rowNode: RowNode, result: RowNode[], nextRowTop: NumberWrapper): void {
        result.push(rowNode);
        rowNode.rowHeight = this.gridOptionsWrapper.getRowHeightForNode(rowNode);
        rowNode.rowTop = nextRowTop.value;
        nextRowTop.value += rowNode.rowHeight;
    }

    private createFooterNode(groupNode: RowNode): RowNode {
        var footerNode = new RowNode(this.eventService, this.gridOptionsWrapper, this.selectionController);
        Object.keys(groupNode).forEach(function (key) {
            (<any>footerNode)[key] = (<any>groupNode)[key];
        });
        footerNode.footer = true;
        // get both header and footer to reference each other as siblings. this is never undone,
        // only overwritten. so if a group is expanded, then contracted, it will have a ghost
        // sibling - but that's fine, as we can ignore this if the header is contracted.
        footerNode.sibling = groupNode;
        groupNode.sibling = footerNode;
        return footerNode;
    }

}

interface NumberWrapper {
    value: number
}