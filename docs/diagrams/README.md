# Diagrams

All diagrams are written as code. Each source file (`.puml` PlantUML, `.mmd` Mermaid, `.sql` DDL) is committed next to its rendered `.svg` and `.png`. **Edit the source, then re-render.** Never edit the images by hand.

| ID | Diagram | Source | Specified in |
|---|---|---|---|
| n/a | Affinity map | `planning/affinity-map.mmd` | 01-prd §8 |
| n/a | Execution plan timeline | `planning/execution-plan.mmd` | 08-execution-plan §2 |
| n/a | General use case diagram | `use-cases/use-case-diagram.puml` | 01-prd §11 |
| n/a | Persistence class diagram | `class-diagram/class-diagram.puml` | 03-data-model §1 |
| n/a | MVC package diagram | `class-diagram/package-diagram.puml` | 02-architecture §3 |
| n/a | Deployment diagram | `architecture/deployment-diagram.puml` | 02-architecture §2 |
| n/a | API request lifecycle | `architecture/request-lifecycle.puml` | 02-architecture §3, §7 |
| SD-01 | Browse and filter catalog | `sequence-diagrams/sd-01-browse-catalog.puml` | UC-01 |
| SD-02 | Place order (stock reserved in the same transaction) | `sequence-diagrams/sd-02-place-order.puml` | UC-03, UC-07 |
| SD-03 | Latest-order card on the home page | `sequence-diagrams/sd-03-latest-order-card.puml` | UC-04, BR-19 |
| SD-04 | View / verify order | `sequence-diagrams/sd-04-view-order.puml` | UC-05, UC-06 |
| AD-01 | Customer purchase journey | `activity-diagrams/ad-01-purchase-journey.puml` | UC-01…UC-05 |
| AD-02 | Latest-order card decision | `activity-diagrams/ad-02-latest-order-card.puml` | UC-04, BR-19 |
| AD-03 | Order verification and payment at pickup | `activity-diagrams/ad-03-pickup-verification.puml` | UC-06, BR-09, BR-18 |
| n/a | Conceptual ER model | `database/er-conceptual.mmd` | 03-data-model §2 |
| n/a | Logical ER model (3NF) | `database/er-logical.mmd` | 03-data-model §3 |
| n/a | Physical ER model | `database/er-physical.mmd` | 03-data-model §6 |
| n/a | Physical DDL | `database/physical-model.sql` | 03-data-model §6 |
| n/a | Seed + constraint checks (PostgreSQL 16) | `database/validation-checks.sql` | 03-data-model §9 |
| n/a | User flow | `user-flows/user-flow.mmd` | 04-ui-design-system §3 |
| n/a | Navigation map | `user-flows/navigation-map.mmd` | 04-ui-design-system §3 |
| n/a | Conceptual map | `user-flows/conceptual-map.mmd` | 04-ui-design-system §3 |
| n/a | Approved mockups (screenshots + HTML) | `../design/` | 04-ui-design-system |

Endpoint paths in the sequence diagrams follow `07-api-spec.md` and `openapi.yaml`. If the contract changes, update SD-01…SD-04 in the same change.

## Rendering

Tools used: PlantUML 1.2022.12 (Java 17+ and Graphviz) and Mermaid CLI 11.4.2.

```bash
# PlantUML (from docs/diagrams)
java -jar plantuml.jar -charset UTF-8 -tsvg  **/*.puml
java -jar plantuml.jar -charset UTF-8 -tpng  **/*.puml

# Mermaid
npx -p @mermaid-js/mermaid-cli@11.4.2 mmdc -i database/er-logical.mmd -o database/er-logical.svg -b white
npx -p @mermaid-js/mermaid-cli@11.4.2 mmdc -i database/er-logical.mmd -o database/er-logical.png -b white -s 2
```

`_style.iuml` holds the shared PlantUML colors and fonts.
