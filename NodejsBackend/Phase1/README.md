# Node.js + TypeScript f�������

Sn������oNode.js + TypeScript�(W_Web�������znfҒ�hWfD~Y

## =� f҅�

### Phase 1: Node.js� + TypeScript  ��
- HTTP����n\
- TypeScriptn���
- RESTful API-
- CRUD�\n��
- **��������**: ����TODO API"�գ����&s�H_�	

### Phase 2: Express.js = ��-
- Express.js�������
- ��릧�
- ��ƣ�
- ������#:

## <� Phase 1 ���

### ��_�
-  **�,CRUD API** - �hjTODO�����
-  ***H�_�** - high/medium/low^
-  **�ƴ�_�** - �ƴ�%TODO�
-  **"_�** - ƭ�����"
-  **գ���_�** - pa�k��^��
-  **&s�H_�** - *H��\����

### API��
```
GET    /todos                    # hTODO֗"�գ���	
POST   /todos                    # TODO\
GET    /todos/:id               # y�TODO֗
PUT    /todos/:id               # TODO��
DELETE /todos/:id               # TODOJd

# ���������
GET /todos?search=Node&category=Learn&priority=high&sortBy=createdAt&order=desc
```

## =� �˹�

### Łj��Ȧ��
- Node.js (v18�
)
- npm ~_o yarn
- TypeScript

### ��Ȣ��
```bash
# �X��n�����
npm install

# TypeScript��Ѥ�
npm run build

# �z����w�TODO API	
npm run dev:todo
# ~_o
npx ts-node src/todo-complete.ts
```

## =� ������� 

```
nodejs-backend/
   src/
      helloTS.ts          # Hello World
      simple-server.ts    # �,HTTP����
      todo-complete.ts    # �hjTODO API P
   package.json
   tsconfig.json
   Q&A-LOG.md             # f�2��O�
   PHASE1-COMPLETION-REPORT.md  # Phase1������
   README.md
```

## =' )(��j�����

- `npm run dev:todo` - TODO API����w�
- `npm run build` - TypeScript��Ѥ�
- `npm run start` - ,j����w�
- `npm run type-check` - ���ï�L

## >� API ƹȋ

### �,�\
```bash
# hTODO֗
curl http://localhost:3000/todos

# TODO\
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"text": "�WD���", "priority": "high", "category": "Work"}'

# y�TODO֗
curl http://localhost:3000/todos/1
```

### ئj"�գ���
```bash
# a�"
curl "http://localhost:3000/todos?search=Node&category=default&priority=high&completed=false&sortBy=createdAt&order=desc"

# *H�h:
curl "http://localhost:3000/todos?sortBy=priority&order=desc"

# �ƴ�գ�
curl "http://localhost:3000/todos?category=Learn"
```

## =� f�2

- **f�Nh�z��**: [Q&A-LOG.md](./Q&A-LOG.md)
- **Phase1������**: [PHASE1-COMPLETION-REPORT.md](./PHASE1-COMPLETION-REPORT.md)

## <� f��hT��

### Phase 1 �  ��
-  TypeScriptn�,��җ
-  Node.js HTTP�����
-  RESTful API-�G
-  ��������
-  ^�Promise, async/await	
-  M�\filter, sort	
-  ���������
-  ���API�z

### Phase 2 � <� !�
- [ ] Express.js�������җ
- [ ] ��릧���
- [ ] ������#:
- [ ] �<���
- [ ] ƹȟ�

## <� �S�Ϥ��

### ��hj-
```typescript
interface Todo {
    id: number;
    text: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
    priority: 'high' | 'medium' | 'low';  // Union�
    category?: string;                     // �׷���
}
```

### ���գ���
```typescript
let result = todos;
if(search) result = result.filter(t => t.text.includes(search));
if(category) result = result.filter(t => t.category === category);
if(priority) result = result.filter(t => t.priority === priority);
```

---

**fҋ��:** 2025-01-01  
**Phase 1 ���:** 2025-01-02  
**�(nէ��:** Phase 2��- � Express.js�