/**
 * @license
 * Copyright 2022-2025 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/*** THIS FILE IS GENERATED, DO NOT EDIT ***/

import { MatterDefinition } from "../MatterDefinition.js";
import {
    ClusterElement as Cluster,
    AttributeElement as Attribute,
    FieldElement as Field,
    DatatypeElement as Datatype
} from "../../elements/index.js";

export const RvcCleanMode = Cluster(
    { name: "RvcCleanMode", id: 0x55, type: "ModeBase" },
    Attribute({ name: "ClusterRevision", id: 0xfffd, type: "ClusterRevision", default: 4 }),
    Attribute(
        { name: "FeatureMap", id: 0xfffc, type: "FeatureMap" },
        Field({ name: "DEPONOFF", conformance: "X", constraint: "0", title: "OnOff" })
    ),
    Attribute({ name: "SupportedModes", id: 0x0 }),
    Attribute({ name: "CurrentMode", id: 0x1 }),
    Attribute({ name: "StartUpMode", id: 0x2, conformance: "X" }),
    Attribute({ name: "OnMode", id: 0x3, conformance: "X" }),
    Datatype({ name: "ModeOptionStruct", type: "ModeOptionStruct" }),
    Datatype({ name: "ModeChangeStatus", type: "enum8" }, Field({ name: "CleaningInProgress", id: 0x40 })),

    Datatype(
        { name: "ModeTag", type: "enum16" },
        Field({ name: "Auto", id: 0x0 }),
        Field({ name: "Quick", id: 0x1 }),
        Field({ name: "Quiet", id: 0x2 }),
        Field({ name: "LowNoise", id: 0x3 }),
        Field({ name: "LowEnergy", id: 0x4 }),
        Field({ name: "Vacation", id: 0x5 }),
        Field({ name: "Min", id: 0x6 }),
        Field({ name: "Max", id: 0x7 }),
        Field({ name: "Night", id: 0x8 }),
        Field({ name: "Day", id: 0x9 }),
        Field({ name: "DeepClean", id: 0x4000 }),
        Field({ name: "Vacuum", id: 0x4001 }),
        Field({ name: "Mop", id: 0x4002 }),
        Field({ name: "VacuumThenMop", id: 0x4003 })
    )
);

MatterDefinition.children.push(RvcCleanMode);
